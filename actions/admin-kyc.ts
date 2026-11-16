"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type AdminKycActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function adminOverrideKycStatus(
  verificationId: string | null,
  userId: string,
  newStatus:
    | "verified"
    | "pending"
    | "in_progress"
    | "rejected"
    | "expired"
    | "resubmitted"
    | "not_started",
  notes?: string
): Promise<AdminKycActionResult> {
  const { user } = await requireAdmin();
  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    // 1. Update profiles table
    const profileUpdates: any = {
      kyc_status: newStatus,
      kyc_verified_at: newStatus === "verified" ? nowIso : null,
    };
    await adminClient.from("profiles").update(profileUpdates).eq("id", userId);

    // 2. Update auth metadata
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          kyc_status: newStatus,
          kyc_verified_at: newStatus === "verified" ? nowIso : null,
        },
      });
    } catch (e) {
      console.warn("Auth metadata update warning:", e);
    }

    // 3. Map status to standard decision text
    let decisionText = "In Review";
    if (newStatus === "verified") decisionText = "Approved";
    else if (newStatus === "rejected") decisionText = "Declined";
    else if (newStatus === "in_progress") decisionText = "In Progress";
    else if (newStatus === "expired") decisionText = "Expired";
    else if (newStatus === "resubmitted") decisionText = "Resubmitted";
    else if (newStatus === "not_started") decisionText = "Not Started";

    // 4. Update kyc_verifications table if verificationId provided
    if (verificationId && !verificationId.startsWith("profile_kyc_")) {
      await adminClient
        .from("kyc_verifications")
        .update({
          status: newStatus,
          decision: decisionText,
          admin_notes: notes || `Manual administrative override by ${user.email}`,
          reviewed_by: user.id,
          verified_at: newStatus === "verified" ? nowIso : null,
          updated_at: nowIso,
        })
        .eq("id", verificationId);
    } else {
      // Create record if none existed
      await adminClient.from("kyc_verifications").insert({
        user_id: userId,
        session_id: `admin_override_${Date.now()}`,
        status: newStatus,
        decision: decisionText,
        admin_notes: notes || `Manual administrative override by ${user.email}`,
        reviewed_by: user.id,
        verified_at: newStatus === "verified" ? nowIso : null,
        updated_at: nowIso,
      });
    }

    // 5. Update fellow_onboarding_progress (Step 1)
    let fellowStatus: "completed" | "in_review" | "failed" | "not_started" = "in_review";
    if (newStatus === "verified") fellowStatus = "completed";
    else if (newStatus === "rejected") fellowStatus = "failed";
    else if (newStatus === "not_started") fellowStatus = "not_started";

    try {
      await adminClient.from("fellow_onboarding_progress").upsert({
        user_id: userId,
        step_id: "step_1_kyc",
        status: fellowStatus,
        score: newStatus === "verified" ? 100 : null,
        submitted_payload: {
          adminOverride: true,
          adminEmail: user.email,
          status: newStatus,
          processedAt: nowIso,
        },
        updated_at: nowIso,
      });
    } catch {
      // Non-fatal
    }

    // 6. Send notification to user
    try {
      let notifTitle = "Identity Verification Update";
      let notifMessage = "Your identity verification status has been updated by compliance.";

      if (newStatus === "verified") {
        notifTitle = "Identity Verified";
        notifMessage =
          "Your identity verification has been approved. You may now continue to tax & project assessments.";
      } else if (newStatus === "rejected") {
        notifTitle = "Identity Verification Declined";
        notifMessage =
          "Your identity verification was declined. Please review requirements and resubmit from your dashboard.";
      } else if (newStatus === "resubmitted") {
        notifTitle = "Identity Resubmission Requested";
        notifMessage =
          "Compliance requested updated identification documents. Please restart your verification.";
      }

      await adminClient.from("notifications").insert({
        user_id: userId,
        title: notifTitle,
        body: notifMessage,
        message: notifMessage,
        read: false,
      });
    } catch {
      // Non-fatal
    }

    revalidatePath("/admin/kyc");
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `KYC verification status successfully updated to ${newStatus}.`,
    };
  } catch (err: any) {
    console.error("adminOverrideKycStatus error:", err);
    return { error: err.message || "Failed to update KYC status." };
  }
}

export async function adminResetKyc(userId: string): Promise<AdminKycActionResult> {
  const { user } = await requireAdmin();
  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    // 1. Reset profiles
    await adminClient
      .from("profiles")
      .update({
        kyc_status: "unverified",
        didit_session_id: null,
        kyc_verified_at: null,
      })
      .eq("id", userId);

    // 2. Reset auth metadata
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          kyc_status: "unverified",
          didit_session_id: null,
          kyc_verified_at: null,
        },
      });
    } catch {
      // Non-fatal
    }

    // 3. Reset progress
    try {
      await adminClient.from("fellow_onboarding_progress").upsert({
        user_id: userId,
        step_id: "step_1_kyc",
        status: "in_review",
        score: null,
        submitted_payload: {
          resetByAdmin: true,
          adminEmail: user.email,
          resetAt: nowIso,
        },
        updated_at: nowIso,
      });
    } catch {
      // Non-fatal
    }

    // 4. Log reset in kyc_verifications
    try {
      await adminClient.from("kyc_verifications").insert({
        user_id: userId,
        session_id: `reset_${Date.now()}`,
        status: "not_started",
        decision: "Reset",
        admin_notes: `KYC reset by admin ${user.email} - fellow prompted to restart verification`,
        reviewed_by: user.id,
        updated_at: nowIso,
      });
    } catch {
      // Non-fatal
    }

    // 5. User notification
    try {
      await adminClient.from("notifications").insert({
        user_id: userId,
        title: "Identity Verification Reset",
        body: "Your identity verification was reset by an administrator. Please start a new verification session.",
        message: "Your identity verification was reset by an administrator. Please start a new verification session.",
        read: false,
      });
    } catch {
      // Non-fatal
    }

    revalidatePath("/admin/kyc");
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Fellow KYC session has been reset. They can now re-verify.",
    };
  } catch (err: any) {
    console.error("adminResetKyc error:", err);
    return { error: err.message || "Failed to reset KYC." };
  }
}

export async function adminDeleteKycVerification(
  verificationId: string
): Promise<AdminKycActionResult> {
  await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("kyc_verifications")
    .delete()
    .eq("id", verificationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/kyc");
  return { success: true, message: "KYC verification record removed." };
}
