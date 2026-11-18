"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { createInAppNotification, notifyKycEvent } from "@/lib/emails/automation";

export type AdminKycActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

/**
 * Decisions an admin can make manually from the KYC console.
 * - verified:               approve identity, unlock the next onboarding step
 * - rejected:               decline identity (reason required)
 * - pending:                put back into manual review
 * - resubmission_requested: ask the contributor to submit new documents (reason required)
 * - unverified:             full reset; contributor starts a fresh verification
 */
export type AdminKycDecision =
  | "verified"
  | "rejected"
  | "pending"
  | "resubmission_requested"
  | "unverified";

const DECISION_CONFIG: Record<
  AdminKycDecision,
  {
    profileStatus: "verified" | "rejected" | "pending" | "unverified";
    auditStatus: string;
    auditDecision: string;
    stepStatus: "completed" | "failed" | "in_review" | "not_started";
    requiresNote: boolean;
    notification: { title: string; body: string };
  }
> = {
  verified: {
    profileStatus: "verified",
    auditStatus: "verified",
    auditDecision: "Approved",
    stepStatus: "completed",
    requiresNote: false,
    notification: {
      title: "Identity Verified",
      body: "Your identity verification has been approved. Continue to Payments & Tax setup.",
    },
  },
  rejected: {
    profileStatus: "rejected",
    auditStatus: "rejected",
    auditDecision: "Declined",
    stepStatus: "failed",
    requiresNote: true,
    notification: {
      title: "Identity Verification Declined",
      body: "Your identity verification was declined. Check your email for details and retry from your dashboard.",
    },
  },
  pending: {
    profileStatus: "pending",
    auditStatus: "pending",
    auditDecision: "In Review",
    stepStatus: "in_review",
    requiresNote: false,
    notification: {
      title: "Identity Verification In Review",
      body: "Your identity verification is being reviewed by our compliance team.",
    },
  },
  resubmission_requested: {
    profileStatus: "unverified",
    auditStatus: "resubmitted",
    auditDecision: "Resubmission Requested",
    stepStatus: "not_started",
    requiresNote: true,
    notification: {
      title: "Identity Resubmission Requested",
      body: "Compliance requested updated identity documents. Please start a new verification.",
    },
  },
  unverified: {
    profileStatus: "unverified",
    auditStatus: "not_started",
    auditDecision: "Reset",
    stepStatus: "not_started",
    requiresNote: false,
    notification: {
      title: "Identity Verification Reset",
      body: "Your identity verification was reset by an administrator. Please start a new verification session.",
    },
  },
};

function revalidateKycViews() {
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/**
 * Manually set a contributor's KYC outcome. Updates the profile, auth metadata,
 * onboarding progress (step 1) and the KYC audit trail, then notifies the user
 * in-app and by email (unless notifyUser is false).
 */
export async function adminSetKycStatus(input: {
  userId: string;
  decision: AdminKycDecision;
  note?: string;
  verificationId?: string | null;
  notifyUser?: boolean;
  /** true = ignore future Didit webhooks for this user; undefined = leave unchanged */
  lock?: boolean;
}): Promise<AdminKycActionResult> {
  const { user: admin } = await requireAdmin();
  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();
  const config = DECISION_CONFIG[input.decision];
  const note = input.note?.trim() || "";
  const notifyUser = input.notifyUser ?? true;

  if (!config) return { error: "Unknown KYC decision." };
  if (config.requiresNote && !note) {
    return { error: "Please add a reason — it is shown to the contributor." };
  }

  const { data: target, error: targetError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", input.userId)
    .maybeSingle();
  if (targetError || !target) return { error: "Contributor not found." };

  const isVerified = config.profileStatus === "verified";
  const isFreshStart = config.profileStatus === "unverified";

  // 1. Core profile status — must succeed.
  const coreUpdate: Record<string, unknown> = {
    kyc_status: config.profileStatus,
    kyc_verified_at: isVerified ? nowIso : null,
  };
  if (isFreshStart) coreUpdate.didit_session_id = null;

  const { error: coreError } = await adminClient
    .from("profiles")
    .update(coreUpdate)
    .eq("id", input.userId);
  if (coreError) {
    console.error("adminSetKycStatus core update failed:", coreError);
    return { error: coreError.message };
  }

  // 2. Manual-review metadata (isolated: columns come from migration 009).
  const reviewUpdate: Record<string, unknown> = {
    kyc_reviewed_by: admin.id,
    kyc_reviewed_at: nowIso,
    kyc_admin_note: note || null,
  };
  if (typeof input.lock === "boolean") reviewUpdate.kyc_locked = input.lock;
  if (isFreshStart && input.lock === undefined) reviewUpdate.kyc_locked = false;

  const { error: reviewError } = await adminClient
    .from("profiles")
    .update(reviewUpdate)
    .eq("id", input.userId);
  if (reviewError) {
    console.warn("KYC review metadata not saved (is migration 009 applied?):", reviewError);
  }

  // 3. Auth metadata mirror.
  const { error: metaError } = await adminClient.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      kyc_status: config.profileStatus,
      kyc_verified_at: isVerified ? nowIso : null,
      ...(isFreshStart ? { didit_session_id: null } : {}),
    },
  });
  if (metaError) console.warn("Auth metadata update warning:", metaError);

  // 4. Audit trail.
  const auditNote = note
    ? `${note} — ${admin.email}`
    : `Manual ${config.auditDecision.toLowerCase()} by ${admin.email}`;
  const auditRow = {
    status: config.auditStatus,
    decision: config.auditDecision,
    admin_notes: auditNote,
    reviewed_by: admin.id,
    verified_at: isVerified ? nowIso : null,
    updated_at: nowIso,
  };

  const hasRealRow =
    input.verificationId && !input.verificationId.startsWith("profile_kyc_");
  const { error: auditError } = hasRealRow
    ? await adminClient
        .from("kyc_verifications")
        .update(auditRow)
        .eq("id", input.verificationId!)
        .eq("user_id", input.userId)
    : await adminClient.from("kyc_verifications").insert({
        ...auditRow,
        user_id: input.userId,
        session_id: `admin_${input.decision}_${Date.now()}`,
        webhook_type: "admin.manual",
      });
  if (auditError) console.warn("KYC audit trail write warning:", auditError);

  // 5. Onboarding step 1.
  const { error: progressError } = await adminClient.from("fellow_onboarding_progress").upsert(
    {
      user_id: input.userId,
      step_id: "step_1_kyc",
      status: config.stepStatus,
      score: isVerified ? 100 : null,
      submitted_payload: {
        adminOverride: true,
        adminEmail: admin.email,
        decision: input.decision,
        note: note || null,
        processedAt: nowIso,
      },
      updated_at: nowIso,
    },
    { onConflict: "user_id,step_id" }
  );
  if (progressError) console.warn("Onboarding progress update warning:", progressError);

  // 6. Notify the contributor.
  if (notifyUser) {
    await createInAppNotification(input.userId, {
      type: "kyc_update",
      title: config.notification.title,
      body: note && !isVerified ? `${config.notification.body} Note: ${note}` : config.notification.body,
      href: "/dashboard?tab=ai-work",
    });

    const emailEvent =
      input.decision === "verified"
        ? "approved"
        : input.decision === "rejected"
        ? "rejected"
        : input.decision === "resubmission_requested"
        ? "resubmission_requested"
        : input.decision === "unverified"
        ? "reset"
        : null; // "pending" is an internal state change — no email

    if (emailEvent) {
      await notifyKycEvent(input.userId, emailEvent, {
        referenceId: `admin_${Date.now()}`,
        note,
      });
    }
  }

  revalidateKycViews();

  const labels: Record<AdminKycDecision, string> = {
    verified: "approved",
    rejected: "declined",
    pending: "moved to manual review",
    resubmission_requested: "sent back for resubmission",
    unverified: "reset",
  };
  return {
    success: true,
    message: `KYC ${labels[input.decision]}${notifyUser ? " and contributor notified" : ""}.`,
  };
}

/**
 * Lock or unlock a contributor's KYC decision. While locked, Didit webhooks are
 * still recorded in the audit log but no longer change the contributor's status.
 */
export async function adminSetKycLock(
  userId: string,
  locked: boolean
): Promise<AdminKycActionResult> {
  const { user: admin } = await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({
      kyc_locked: locked,
      kyc_reviewed_by: admin.id,
      kyc_reviewed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return {
      error:
        error.code === "42703"
          ? "KYC lock requires database migration 009 to be applied."
          : error.message,
    };
  }

  revalidateKycViews();
  return {
    success: true,
    message: locked
      ? "KYC decision locked — Didit updates will no longer change it."
      : "KYC decision unlocked — Didit updates apply again.",
  };
}

export async function adminDeleteKycVerification(
  verificationId: string
): Promise<AdminKycActionResult> {
  await requireAdmin();
  if (verificationId.startsWith("profile_kyc_")) {
    return { error: "This row is derived from the profile and has no audit record to delete." };
  }
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
