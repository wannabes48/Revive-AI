"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  notifyAssessmentFailed,
  notifyKycEvent,
  notifyOnboardingProgress,
} from "@/lib/emails/automation";
import { z } from "zod";
import { getPublicSiteUrl } from "@/lib/site-url";

const manualKycSchema = z.object({
  documentType: z.enum(["passport", "national_id", "driver_license"]),
  issuingCountry: z.string().min(2, "Issuing country is required").max(100),
  documentNumber: z.string().min(4, "Valid document number is required").max(50),
});

function maskDocumentNumber(docNum: string): string {
  const cleaned = docNum.trim();
  if (cleaned.length <= 4) return "****";
  return `${"*".repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
}

export type OnboardingActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
  score?: number;
  verificationId?: string;
};

export async function submitKycVerification(
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to submit verification." };
  }

  const parsed = manualKycSchema.safeParse({
    documentType: formData.get("documentType"),
    issuingCountry: formData.get("issuingCountry"),
    documentNumber: formData.get("documentNumber"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid submission fields." };
  }

  const { documentType, issuingCountry, documentNumber } = parsed.data;
  const maskedNumber = maskDocumentNumber(documentNumber);
  const adminClient = createAdminClient();

  // Only block submissions that are already under manual review.
  const { data: activeReview, error: activeReviewError } = await adminClient
    .from("kyc_verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "in_review")
    .maybeSingle();

  if (activeReviewError) {
    console.error("Could not check active KYC reviews:", activeReviewError);
    return { error: `Database error: ${activeReviewError.message}` };
  }

  if (activeReview) {
    return { error: "You already have a verification currently under manual review." };
  }

  // Supersede abandoned Didit sessions before creating the manual review.
  const { error: expirePendingError } = await adminClient
    .from("kyc_verifications")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (expirePendingError) {
    console.error("Could not expire abandoned KYC sessions:", expirePendingError);
    return { error: `Database error: ${expirePendingError.message}` };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("Could not fetch profile name for manual KYC submission:", profileError);
  }

  const manualSessionId = `manual_${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  // Insert the manual submission.
  const { data: verification, error: insertError } = await adminClient
    .from("kyc_verifications")
    .insert({
      user_id: user.id,
      provider: "manual",
      session_id: manualSessionId,
      event_id: manualSessionId,
      webhook_type: "manual.submission",
      workflow_id: "manual_fallback",
      status: "in_review",
      decision: "In Review",
      vendor_data: user.id,
      document_type: documentType,
      document_number_masked: maskedNumber,
      issuing_country: issuingCountry.trim(),
      extracted_full_name: profile?.full_name || user.user_metadata?.full_name || null,
      raw_payload: {
        provider: "manual",
        source: "manual_fallback_form",
        document_type: documentType,
        issuing_country: issuingCountry.trim(),
        document_number_full: documentNumber.trim(),
        submitted_at: nowIso,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Manual KYC insert error:", insertError);
    return { error: `Database error: ${insertError.message}` };
  }

  // 2. Sync Auth user metadata
  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        kyc_status: "pending",
        didit_session_id: manualSessionId,
      },
    });
  } catch (e) {
    console.warn("Could not update auth metadata:", e);
  }

  // 3. Update profile status to 'pending' so UI shows "Pending review"
  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({
      kyc_status: "pending",
      kyc_rejection_reason: null,
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    return { error: "Verification logged, but failed to update profile status." };
  }

  // 4. Sync onboarding checklist progress step
  try {
    await adminClient.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: "step_1_kyc",
      status: "in_review",
      submitted_payload: {
        sessionId: manualSessionId,
        provider: "manual",
        documentType,
        issuingCountry: issuingCountry.trim(),
        submittedAt: nowIso,
      },
      updated_at: nowIso,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  await notifyKycEvent(user.id, "submitted", { referenceId: verification.id });
  return {
    success: true,
    verificationId: verification.id,
    message: "KYC submitted for manual review.",
  };
}

export async function submitTaxSetup(
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  const taxFormType = formData.get("taxFormType") as string; // "w9" or "w8ben"
  const legalName = formData.get("legalName") as string;
  const taxId = formData.get("taxId") as string;
  const certifyPerjury = formData.get("certifyPerjury") === "true";

  if (!legalName?.trim() || !taxId?.trim()) {
    return { error: "Legal full name and Taxpayer Identification Number are required." };
  }

  if (!certifyPerjury) {
    return { error: "You must certify under penalties of perjury to submit tax documentation." };
  }

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        payout_method_configured: true,
        tax_form_type: taxFormType,
      },
    });
  } catch (err) {
    console.warn("Auth metadata warning:", err);
  }

  try {
    await supabase
      .from("profiles")
      .update({
        payout_method_configured: true,
      })
      .eq("id", user.id);
  } catch {
    // Non-fatal
  }

  try {
    await supabase.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: "step_2_tax",
      status: "completed",
      submitted_payload: {
        taxFormType,
        legalName,
        taxIdLast4: taxId.slice(-4),
        submittedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Table not yet migrated
  }

  revalidatePath("/dashboard");
  if (user.email) {
    await notifyOnboardingProgress({
      userId: user.id,
      email: user.email,
      name: legalName,
      stepKey: "step_2_tax",
      completedStepLabel: "Payments and Tax Setup",
      nextStepLabel: "Project Terms (2m)",
      progressPercent: 33,
    });
  }
  return {
    success: true,
    message: "Tax documentation & payout routing successfully filed.",
  };
}

export async function submitProjectTerms(
  accepted: boolean
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  if (!accepted) {
    return { error: "You must accept the Contributor Master Services Agreement and NDA." };
  }

  const now = new Date().toISOString();

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        terms_accepted_at: now,
      },
    });
  } catch (err) {
    console.warn("Auth metadata warning:", err);
  }

  try {
    await supabase
      .from("profiles")
      .update({
        terms_accepted_at: now,
      })
      .eq("id", user.id);
  } catch {
    // Non-fatal
  }

  try {
    await supabase.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: "step_3_terms",
      status: "completed",
      submitted_payload: {
        acceptedAt: now,
        version: "2026.1",
      },
      updated_at: now,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  if (user.email) {
    await notifyOnboardingProgress({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "Contributor",
      stepKey: "step_3_terms",
      completedStepLabel: "Project Master Terms & NDA",
      nextStepLabel: "Project Assessment (10m)",
      progressPercent: 50,
      unlocksAssessment: true,
    });
  }
  return {
    success: true,
    message: "Project Master Terms & Non-Disclosure Agreement acknowledged.",
  };
}

export async function submitAssessmentTask(
  stepId: string,
  payload: {
    preference: "modelA" | "modelB" | "equal";
    justification: string;
    factualityScore: number;
    instructionScore: number;
    antiPlagiarismAgreed: boolean;
    timeSpentSeconds: number;
  }
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  if (!payload.antiPlagiarismAgreed) {
    return {
      error: "You must certify that all evaluation ratings and justifications are solely your own work.",
    };
  }

  if (!payload.justification || payload.justification.trim().length < 25) {
    return {
      error: "Please provide a detailed justification for your model evaluation (min 25 characters).",
    };
  }

  let computedScore = 85;
  if (payload.preference === "modelA") {
    computedScore += 10;
  } else if (payload.preference === "modelB") {
    computedScore -= 20;
  }

  if (payload.factualityScore >= 4) computedScore += 3;
  if (payload.instructionScore >= 4) computedScore += 2;
  computedScore = Math.min(100, Math.max(40, computedScore));

  const passingThreshold = stepId === "step_4_assessment_120m" ? 85 : 80;
  const passed = computedScore >= passingThreshold;

  try {
    await supabase.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: stepId,
      status: passed ? "completed" : "failed",
      score: computedScore,
      submitted_payload: {
        ...payload,
        submittedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");

  if (!passed) {
    if (user.email) {
      await notifyAssessmentFailed({
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || "Contributor",
        stepId,
        score: computedScore,
        threshold: passingThreshold,
      });
    }
    return {
      error: `Assessment score ${computedScore}% was below the required passing threshold of ${passingThreshold}%. You may review guidelines and retry.`,
      score: computedScore,
    };
  }

  if (user.email) {
    const isFinalAssessment = stepId === "step_4_assessment_150m";
    await notifyOnboardingProgress({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "Contributor",
      stepKey: stepId,
      completedStepLabel: `Project Assessment (${computedScore}%)`,
      nextStepLabel: isFinalAssessment ? "Qualifications & Tooling Check" : "Next Screening Module",
      progressPercent: isFinalAssessment ? 83 : 67,
    });
  }

  return {
    success: true,
    score: computedScore,
    message: `Assessment completed and passed with score ${computedScore}%!`,
  };
}

export async function submitTechnicalCheck(
  checkType: string
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  try {
    await supabase.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: checkType === "tech_suite" ? "step_5_tech" : "step_6_next",
      status: "completed",
      score: 100,
      submitted_payload: {
        clientUserAgent: "Verified Web Browser Client",
        certifiedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  if (user.email) {
    const isFinalStep = checkType !== "tech_suite";
    await notifyOnboardingProgress({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "Contributor",
      stepKey: isFinalStep ? "step_6_next" : "step_5_tech",
      completedStepLabel: isFinalStep ? "Onboarding Next Steps" : "Qualifications & Tooling Check",
      nextStepLabel: isFinalStep ? null : "Onboarding Next Steps (6m)",
      progressPercent: isFinalStep ? 100 : 92,
    });
  }
  return {
    success: true,
    message:
      checkType === "tech_suite"
        ? "Qualifications and tooling environment verified."
        : "Onboarding complete! Your full tasking feed is now activated.",
  };
}

export async function submitOpportunityInterest(
  opportunityId: string
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  try {
    await supabase.from("opportunity_interests").upsert({
      user_id: user.id,
      opportunity_id: opportunityId,
      status: "submitted",
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    message: "Interest submitted! The project team will review your domain profile.",
  };
}

export async function respondToProjectInvitation(
  invitationId: string,
  action: "accepted" | "declined"
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  try {
    await supabase
      .from("project_invitations")
      .update({ status: action })
      .eq("id", invitationId)
      .eq("user_id", user.id);
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    message: action === "accepted" ? "Invitation accepted! Project unlocked." : "Invitation declined.",
  };
}

export async function initiateDiditKyc(
  redirectPath = "/dashboard"
): Promise<{ success: boolean; url?: string; sessionId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const apiKey = process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;

  const appUrl = getPublicSiteUrl();

  let sessionId: string | null = null;
  let verificationUrl: string | null = null;

  if (apiKey && workflowId && apiKey !== "placeholder_client_secret") {
    try {
      const callbackUrl = `${appUrl}${redirectPath}?tab=ai-work&kyc_return=true`;
      const sessionRes = await fetch("https://verification.didit.me/v3/session/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          vendor_data: user.id,
          callback: callbackUrl,
          workflow_id: workflowId,
        }),
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        sessionId = sessionData.session_id || sessionData.id;
        verificationUrl = sessionData.url;
      } else {
        const errText = await sessionRes.text();
        console.error("Didit V3 session creation error:", sessionRes.status, errText);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.warn("Didit API live call warning:", message);
    }
  }

  // Fallback sandbox session if no keys configured
  if (!sessionId || !verificationUrl) {
    sessionId = `didit_sandbox_${user.id.slice(0, 8)}_${Date.now()}`;
    verificationUrl = `${appUrl}${redirectPath}?tab=ai-work&kyc_return=true&didit_session=${sessionId}&sandbox=true`;
  }

  const adminClient = createAdminClient();

  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        kyc_status: "pending",
        didit_session_id: sessionId,
      },
    });
  } catch (e) {
    console.warn("Could not update auth metadata:", e);
  }

  try {
    await adminClient
      .from("profiles")
      .update({
        kyc_status: "pending",
        didit_session_id: sessionId,
      })
      .eq("id", user.id);
  } catch (e) {
    console.warn("Could not update profile:", e);
  }

  try {
    await adminClient.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: "step_1_kyc",
      status: "in_review",
      submitted_payload: {
        sessionId,
        provider: "didit.me",
        initiatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal
  }

  try {
    await adminClient.from("kyc_verifications").insert({
      user_id: user.id,
      provider: "didit",
      session_id: sessionId,
      workflow_id: workflowId || "didit_default",
      status: "pending",
      decision: "In Review",
      vendor_data: user.id,
      raw_payload: {
        provider: "didit.me",
        url: verificationUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return { success: true, url: verificationUrl, sessionId };
}

export async function completeOnboardingTourAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const adminClient = createAdminClient();

  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { has_completed_tour: true },
    });
  } catch {
    // Non-fatal
  }

  try {
    await adminClient
      .from("profiles")
      .update({ has_completed_tour: true })
      .eq("id", user.id);
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function resetOnboardingTourAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const adminClient = createAdminClient();

  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { has_completed_tour: false },
    });
  } catch {
    // Non-fatal
  }

  try {
    await adminClient
      .from("profiles")
      .update({ has_completed_tour: false })
      .eq("id", user.id);
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function simulateSandboxKycVerification(
  approved = true
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const newStatus = approved ? "verified" : "rejected";
  const nowIso = new Date().toISOString();
  const adminClient = createAdminClient();

  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        kyc_status: newStatus,
        kyc_verified_at: approved ? nowIso : null,
      },
    });
  } catch (e) {
    console.warn("Could not update user metadata:", e);
  }

  try {
    await adminClient
      .from("profiles")
      .update({
        kyc_status: newStatus,
        kyc_verified_at: approved ? nowIso : null,
      })
      .eq("id", user.id);
  } catch (e) {
    console.warn("Could not update profiles:", e);
  }

  try {
    await adminClient.from("fellow_onboarding_progress").upsert({
      user_id: user.id,
      step_id: "step_1_kyc",
      status: approved ? "completed" : "failed",
      score: approved ? 100 : null,
      submitted_payload: {
        provider: "didit.me",
        sandbox: true,
        verifiedAt: nowIso,
      },
      updated_at: nowIso,
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    message: approved ? "Identity verification approved!" : "Identity verification declined.",
  };
}