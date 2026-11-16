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
  newStatus: "verified" | "pending" | "rejected",
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

    // 3. Update kyc_verifications table if verificationId provided
    if (verificationId) {
      await adminClient
        .from("kyc_verifications")
        .update({
          status: newStatus,
          decision:
            newStatus === "verified"
              ? "Approved"
              : newStatus === "rejected"
              ? "Declined"
              : "In Review",
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
        decision:
          newStatus === "verified"
            ? "Approved"
            : newStatus === "rejected"
            ? "Declined"
            : "In Review",
        admin_notes: notes || `Manual administrative override by ${user.email}`,
        reviewed_by: user.id,
        verified_at: newStatus === "verified" ? nowIso : null,
      });
    }

    // 4. Update fellow_onboarding_progress (Step 1)
    const fellowStatus =
      newStatus === "verified"
        ? "completed"
        : newStatus === "rejected"
        ? "failed"
        : "in_review";
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

    // 5. Send notification to user
    try {
      await adminClient.from("notifications").insert({
        user_id: userId,
        title:
          newStatus === "verified"
            ? "Identity Verified"
            : newStatus === "rejected"
            ? "Identity Verification Declined"
            : "Identity Verification Under Review",
        message:
          newStatus === "verified"
            ? "Your identity verification has been approved. You may now continue onboarding."
            : newStatus === "rejected"
            ? "Your identity verification was declined. Please review requirements and resubmit."
            : "Your identity verification is currently undergoing review.",
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
