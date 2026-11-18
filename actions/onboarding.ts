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
import {
  ASSESSMENT_GRACE_SECONDS,
  ASSESSMENT_RETRY_COOLDOWN_HOURS,
  getAssessment,
  gradeAssessment,
  isAssessmentStepId,
  toPublicAssessment,
} from "@/lib/assessments";
import type {
  AssessmentAnswers,
  AssessmentResult,
  AssessmentSession,
  AssessmentStepId,
} from "@/lib/assessment-types";
import {
  getStepDefinition,
  isStepUnlocked,
  nextStepAfter,
  progressPercentAfter,
  resolveOnboardingSteps,
  type OnboardingProgressRow,
  type OnboardingStepState,
} from "@/lib/onboarding-steps";
import type { Profile } from "@/lib/supabase/types";

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
    }, { onConflict: "user_id,step_id" });
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

type AdminClient = ReturnType<typeof createAdminClient>;

type ProgressWrite = {
  user_id: string;
  step_id: string;
  status: string;
  score?: number | null;
  submitted_payload: Record<string, unknown>;
};

/** Writes one onboarding step row. Returns an error message instead of failing silently. */
async function saveProgress(adminClient: AdminClient, row: ProgressWrite): Promise<string | null> {
  const { error } = await adminClient
    .from("fellow_onboarding_progress")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id,step_id" });
  if (error) {
    console.error(`Could not save onboarding step ${row.step_id}:`, error);
    return error.message;
  }
  return null;
}

/** Loads the contributor's profile, raw progress rows and the gated checklist. */
async function loadOnboardingState(adminClient: AdminClient, userId: string) {
  const [{ data: profile }, { data: rows, error }] = await Promise.all([
    adminClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
    adminClient
      .from("fellow_onboarding_progress")
      .select("step_id, status, score, updated_at, submitted_payload")
      .eq("user_id", userId),
  ]);
  if (error) console.error("Could not load onboarding progress:", error);
  const progress = (rows || []) as OnboardingProgressRow[];
  return {
    profile: profile as (Profile & Record<string, unknown>) | null,
    progress,
    steps: resolveOnboardingSteps(profile as Profile | null, progress),
  };
}

async function notifyStepCompleted(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  stepId: string,
  completedLabel?: string
) {
  if (!user.email) return;
  const def = getStepDefinition(stepId);
  const next = nextStepAfter(stepId);
  await notifyOnboardingProgress({
    userId: user.id,
    email: user.email,
    name: (user.user_metadata?.full_name as string) || "Contributor",
    stepKey: stepId,
    completedStepLabel: completedLabel || def?.label || stepId,
    nextStepLabel: next?.label ?? null,
    progressPercent: progressPercentAfter(stepId),
    unlocksAssessment: next?.id === "step_4_assessment_10m",
  });
}

function lockedStepError(steps: OnboardingStepState[], stepId: string): string | null {
  if (isStepUnlocked(steps, stepId)) return null;
  const blocker = steps.find((s) => s.status !== "completed");
  return blocker
    ? `Please complete "${blocker.title}" first.`
    : "Please complete the previous onboarding steps first.";
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

  const adminClient = createAdminClient();

  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        payout_method_configured: true,
        tax_form_type: taxFormType,
      },
    });
  } catch (err) {
    console.warn("Auth metadata warning:", err);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ payout_method_configured: true })
    .eq("id", user.id);
  if (profileError) {
    console.error("Could not save payout setup:", profileError);
    return { error: "Could not save your tax setup. Please try again." };
  }

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: "step_2_tax",
    status: "completed",
    submitted_payload: {
      taxFormType,
      legalName,
      taxIdLast4: taxId.slice(-4),
      submittedAt: new Date().toISOString(),
    },
  });
  if (saveError) console.warn("Tax step saved on profile; progress row warning:", saveError);

  revalidatePath("/dashboard");
  await notifyStepCompleted({ ...user, user_metadata: { full_name: legalName } }, "step_2_tax");
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
  const adminClient = createAdminClient();

  try {
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        terms_accepted_at: now,
      },
    });
  } catch (err) {
    console.warn("Auth metadata warning:", err);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ terms_accepted_at: now })
    .eq("id", user.id);
  if (profileError) {
    console.error("Could not save terms acceptance:", profileError);
    return { error: "Could not record your acceptance. Please try again." };
  }

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: "step_3_terms",
    status: "completed",
    submitted_payload: {
      acceptedAt: now,
      version: "2026.1",
    },
  });
  if (saveError) console.warn("Terms saved on profile; progress row warning:", saveError);

  revalidatePath("/dashboard");
  await notifyStepCompleted(user, "step_3_terms");
  return {
    success: true,
    message: "Project Master Terms & Non-Disclosure Agreement acknowledged.",
  };
}

/* -------------------------------------------------------------------------- */
/*  Timed assessments                                                         */
/* -------------------------------------------------------------------------- */

export type AssessmentActionResult = {
  error?: string;
  session?: AssessmentSession;
  result?: AssessmentResult;
  message?: string;
};

type AttemptPayload = {
  attempt?: number;
  startedAt?: string;
  expiresAt?: string;
  retryAvailableAt?: string | null;
  history?: unknown[];
};

function readAttempt(row: OnboardingProgressRow | undefined): AttemptPayload {
  const payload = row?.submitted_payload;
  return payload && typeof payload === "object" ? (payload as AttemptPayload) : {};
}

function formatWait(until: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Fails an attempt whose timer ran out without a submission. */
async function expireAttempt(
  adminClient: AdminClient,
  userId: string,
  stepId: AssessmentStepId,
  attempt: AttemptPayload
) {
  const now = new Date();
  const retryAvailableAt = new Date(
    now.getTime() + ASSESSMENT_RETRY_COOLDOWN_HOURS * 3600 * 1000
  ).toISOString();
  await saveProgress(adminClient, {
    user_id: userId,
    step_id: stepId,
    status: "failed",
    score: 0,
    submitted_payload: {
      ...attempt,
      timedOut: true,
      submittedAt: now.toISOString(),
      retryAvailableAt,
      history: [
        ...(attempt.history || []),
        { attempt: attempt.attempt, score: 0, timedOut: true, at: now.toISOString() },
      ],
    },
  });
  return retryAvailableAt;
}

/**
 * Starts (or resumes) a timed attempt. The timer is enforced on the server from
 * `startedAt`, so closing the window does not pause it.
 */
export async function startAssessment(stepId: string): Promise<AssessmentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };
  if (!isAssessmentStepId(stepId)) return { error: "Unknown assessment." };

  const adminClient = createAdminClient();
  const { steps, progress } = await loadOnboardingState(adminClient, user.id);
  const gateError = lockedStepError(steps, stepId);
  if (gateError) return { error: gateError };

  const step = steps.find((s) => s.id === stepId);
  if (step?.status === "completed") return { error: "You have already passed this assessment." };

  const def = getAssessment(stepId);
  const row = progress.find((p) => p.step_id === stepId);
  const previous = readAttempt(row);
  const now = new Date();

  if (row?.status === "in_progress" && previous.startedAt && previous.expiresAt) {
    const expires = new Date(previous.expiresAt);
    if (now.getTime() <= expires.getTime() + ASSESSMENT_GRACE_SECONDS * 1000) {
      return {
        session: {
          assessment: toPublicAssessment(def),
          startedAt: previous.startedAt,
          expiresAt: previous.expiresAt,
          attempt: previous.attempt || 1,
        },
      };
    }
    const retryAt = await expireAttempt(adminClient, user.id, stepId, previous);
    revalidatePath("/dashboard");
    return {
      error: `Your previous attempt ran out of time and was not submitted. You can retry in ${formatWait(
        new Date(retryAt),
        now
      )}.`,
    };
  }

  if (row?.status === "failed" && previous.retryAvailableAt) {
    const retryAt = new Date(previous.retryAvailableAt);
    if (retryAt > now) {
      return { error: `You can retry this assessment in ${formatWait(retryAt, now)}.` };
    }
  }

  const attempt = (previous.attempt || 0) + 1;
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + def.durationMinutes * 60 * 1000).toISOString();

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: stepId,
    status: "in_progress",
    score: null,
    submitted_payload: {
      attempt,
      startedAt,
      expiresAt,
      history: previous.history || [],
    },
  });
  if (saveError) {
    return { error: "We couldn't start your assessment. Please try again in a moment." };
  }

  revalidatePath("/dashboard");
  return {
    session: { assessment: toPublicAssessment(def), startedAt, expiresAt, attempt },
  };
}

export async function submitAssessment(
  stepId: string,
  input: { answers: AssessmentAnswers; antiPlagiarismAgreed: boolean }
): Promise<AssessmentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };
  if (!isAssessmentStepId(stepId)) return { error: "Unknown assessment." };
  if (!input?.antiPlagiarismAgreed) {
    return { error: "Please confirm that your answers are your own work." };
  }

  const adminClient = createAdminClient();
  const { progress } = await loadOnboardingState(adminClient, user.id);
  const row = progress.find((p) => p.step_id === stepId);
  const attempt = readAttempt(row);

  if (row?.status === "completed" || row?.status === "passed") {
    return { error: "You have already passed this assessment." };
  }
  if (row?.status !== "in_progress" || !attempt.startedAt || !attempt.expiresAt) {
    return { error: "This attempt is no longer active. Please start the assessment again." };
  }

  const def = getAssessment(stepId);
  const now = new Date();

  if (now.getTime() > new Date(attempt.expiresAt).getTime() + ASSESSMENT_GRACE_SECONDS * 1000) {
    const retryAt = await expireAttempt(adminClient, user.id, stepId, attempt);
    revalidatePath("/dashboard");
    return {
      error: `Time ran out before this attempt was submitted. You can retry in ${formatWait(
        new Date(retryAt),
        now
      )}.`,
    };
  }

  // Keep only answers to real questions, capped in size.
  const knownIds = new Set(def.tasks.flatMap((t) => t.questions.map((q) => q.id)));
  const answers: AssessmentAnswers = {};
  for (const [key, value] of Object.entries(input.answers || {})) {
    if (knownIds.has(key) && typeof value === "string") answers[key] = value.slice(0, 5000);
  }

  const graded = gradeAssessment(def, answers);
  const retryAvailableAt = graded.passed
    ? null
    : new Date(now.getTime() + ASSESSMENT_RETRY_COOLDOWN_HOURS * 3600 * 1000).toISOString();
  const submittedAt = now.toISOString();
  const timeSpentSeconds = Math.round(
    (now.getTime() - new Date(attempt.startedAt).getTime()) / 1000
  );

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: stepId,
    status: graded.passed ? "completed" : "failed",
    score: graded.score,
    submitted_payload: {
      attempt: attempt.attempt || 1,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt,
      timeSpentSeconds,
      answers,
      breakdown: graded.questions,
      antiPlagiarismAgreed: true,
      retryAvailableAt,
      history: [
        ...(attempt.history || []),
        { attempt: attempt.attempt || 1, score: graded.score, passed: graded.passed, at: submittedAt },
      ],
    },
  });
  if (saveError) {
    return {
      error: "Your answers were graded but we couldn't save the result. Please submit again.",
    };
  }

  revalidatePath("/dashboard");

  if (graded.passed) {
    await notifyStepCompleted(user, stepId, `${getStepDefinition(stepId)?.label} — ${graded.score}%`);
  } else if (user.email) {
    await notifyAssessmentFailed({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || "Contributor",
      stepId,
      score: graded.score,
      threshold: def.passingScore,
    });
  }

  return {
    result: {
      score: graded.score,
      passed: graded.passed,
      passingScore: def.passingScore,
      choiceCorrect: graded.choiceCorrect,
      choiceTotal: graded.choiceTotal,
      writtenEarned: graded.writtenEarned,
      writtenMax: graded.writtenMax,
      questions: graded.questions,
      retryAvailableAt,
    },
    message: graded.passed
      ? `Passed with ${graded.score}%. The next step is now unlocked.`
      : `You scored ${graded.score}% — ${def.passingScore}% is needed to pass.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Final checks                                                              */
/* -------------------------------------------------------------------------- */

/** Missing qualification items for the Qualifications check, in display order. */
function missingQualifications(profile: (Profile & Record<string, unknown>) | null): string[] {
  const missing: string[] = [];
  if (!profile?.resume_path) missing.push("Upload your resume");
  if (!profile?.expertise) missing.push("Choose your primary expertise");
  if ((profile?.skills?.length ?? 0) < 3) missing.push("Add at least 3 skills");
  return missing;
}

export async function submitQualificationsCheck(): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const adminClient = createAdminClient();
  const { profile, steps } = await loadOnboardingState(adminClient, user.id);
  const gateError = lockedStepError(steps, "step_5_tech");
  if (gateError) return { error: gateError };

  const missing = missingQualifications(profile);
  if (missing.length > 0) {
    return { error: `Before this check can pass: ${missing.join(", ")}.` };
  }

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: "step_5_tech",
    status: "completed",
    score: 100,
    submitted_payload: {
      resumeFilename: profile?.resume_filename || null,
      expertise: profile?.expertise || null,
      skillsCount: profile?.skills?.length ?? 0,
      verifiedAt: new Date().toISOString(),
    },
  });
  if (saveError) return { error: "Could not save this step. Please try again." };

  revalidatePath("/dashboard");
  await notifyStepCompleted(user, "step_5_tech");
  return { success: true, message: "Qualifications confirmed." };
}

const toolingSchema = z.object({
  googleEmail: z.string().trim().email("Enter a valid Google account email address.").max(200),
  slackConfirmed: z.literal(true, { message: "Please confirm you can use Slack for project communication." }),
});

export async function submitToolingCheck(input: {
  googleEmail: string;
  slackConfirmed: boolean;
}): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const parsed = toolingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid details." };

  const adminClient = createAdminClient();
  const { steps } = await loadOnboardingState(adminClient, user.id);
  const gateError = lockedStepError(steps, "step_5_gsuite");
  if (gateError) return { error: gateError };

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: "step_5_gsuite",
    status: "completed",
    score: 100,
    submitted_payload: {
      googleEmail: parsed.data.googleEmail.toLowerCase(),
      slackConfirmed: true,
      confirmedAt: new Date().toISOString(),
    },
  });
  if (saveError) return { error: "Could not save this step. Please try again." };

  revalidatePath("/dashboard");
  await notifyStepCompleted(user, "step_5_gsuite");
  return { success: true, message: "Google account saved. Project invites will be sent there." };
}

export async function completeOnboarding(): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const adminClient = createAdminClient();
  const { steps } = await loadOnboardingState(adminClient, user.id);
  const gateError = lockedStepError(steps, "step_6_next");
  if (gateError) return { error: gateError };

  const saveError = await saveProgress(adminClient, {
    user_id: user.id,
    step_id: "step_6_next",
    status: "completed",
    score: 100,
    submitted_payload: { completedAt: new Date().toISOString() },
  });
  if (saveError) return { error: "Could not save this step. Please try again." };

  revalidatePath("/dashboard");
  await notifyStepCompleted(user, "step_6_next");
  return {
    success: true,
    message: "Onboarding complete! Your full tasking feed is now activated.",
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
    }, { onConflict: "user_id,step_id" });
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
    }, { onConflict: "user_id,step_id" });
  } catch {
    // Non-fatal
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    message: approved ? "Identity verification approved!" : "Identity verification declined.",
  };
}