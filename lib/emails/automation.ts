import { createAdminClient } from "@/lib/supabase/server";
import { sendEmailSafe, sendEmailBatch } from "@/lib/emails/resend";
import {
  onboardingStepCompletedEmail,
  startAssessmentEmail,
  finishProfileReminderEmail,
  projectAvailabilityReminderEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  accountSuspendedEmail,
  kycStatusEmail,
  assessmentFailedEmail,
  newTaskAvailableEmail,
  profileDetailsReminderEmail,
  payoutSentEmail,
  type PayoutEmailEntry,
} from "@/lib/emails/templates";

/* -------------------------------------------------------------------------- */
/*  Core: deduplicated delivery                                               */
/* -------------------------------------------------------------------------- */

const UNIQUE_VIOLATION = "23505";

function isValidEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export interface DedupedEmail {
  userId: string;
  to: string;
  notificationKey: string;
  subject: string;
  html: string;
}

/**
 * Sends an email at most once per (user, notificationKey).
 *
 * The log row is claimed *before* sending (relying on the UNIQUE constraint),
 * so concurrent callers — e.g. Didit retrying a webhook — can't double-send.
 * If delivery fails the claim is released so a later run can retry.
 */
export async function dispatchDeduplicatedEmail(
  params: DedupedEmail
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  if (!isValidEmail(params.to)) {
    return { success: false, error: "Invalid recipient email address." };
  }

  const adminClient = createAdminClient();
  const { error: claimError } = await adminClient.from("email_notifications_log").insert({
    user_id: params.userId,
    notification_key: params.notificationKey,
    subject: params.subject,
    sent_to: params.to,
  });

  if (claimError) {
    if (claimError.code === UNIQUE_VIOLATION) return { success: false, skipped: true };
    console.error("[Email Automation] Could not claim notification key:", claimError);
    return { success: false, error: claimError.message };
  }

  const result = await sendEmailSafe({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (!result.success) {
    await releaseEmailKeys(params.userId, [params.notificationKey]);
  }

  return { success: result.success, error: result.error };
}

/**
 * Bulk variant of dispatchDeduplicatedEmail. Claims every key in one query,
 * sends only the newly-claimed ones through Resend's batch API, and releases
 * the claims of any that failed. Returns the number of emails delivered.
 */
export async function dispatchDeduplicatedEmails(emails: DedupedEmail[]): Promise<number> {
  const valid = emails.filter((e) => isValidEmail(e.to));
  if (valid.length === 0) return 0;

  const adminClient = createAdminClient();
  let delivered = 0;

  // Claim in chunks to keep request payloads small.
  for (let start = 0; start < valid.length; start += 500) {
    const chunk = valid.slice(start, start + 500);
    const { data: claimed, error } = await adminClient
      .from("email_notifications_log")
      .upsert(
        chunk.map((e) => ({
          user_id: e.userId,
          notification_key: e.notificationKey,
          subject: e.subject,
          sent_to: e.to,
        })),
        { onConflict: "user_id,notification_key", ignoreDuplicates: true }
      )
      .select("id, user_id, notification_key");

    if (error) {
      console.error("[Email Automation] Bulk claim failed:", error);
      continue;
    }

    const claimedKeys = new Map(
      (claimed || []).map((row) => [`${row.user_id}::${row.notification_key}`, row.id as string])
    );
    const toSend = chunk.filter((e) => claimedKeys.has(`${e.userId}::${e.notificationKey}`));
    if (toSend.length === 0) continue;

    const results = await sendEmailBatch(
      toSend.map((e) => ({ to: e.to.trim(), subject: e.subject, html: e.html }))
    );

    const failedIds: string[] = [];
    results.forEach((ok, i) => {
      if (ok) delivered++;
      else failedIds.push(claimedKeys.get(`${toSend[i].userId}::${toSend[i].notificationKey}`)!);
    });

    if (failedIds.length > 0) {
      await adminClient.from("email_notifications_log").delete().in("id", failedIds);
    }
  }

  return delivered;
}

/** Forget that the given emails were sent, so they can be sent again later. */
export async function releaseEmailKeys(userId: string, keys: string[]) {
  if (keys.length === 0) return;
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("email_notifications_log")
    .delete()
    .eq("user_id", userId)
    .in("notification_key", keys);
  if (error) console.warn("[Email Automation] Could not release email keys:", error);
}

/** Forget every logged email whose key starts with `prefix` (e.g. a reminder series). */
export async function releaseEmailKeyPrefix(userId: string, prefix: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("email_notifications_log")
    .delete()
    .eq("user_id", userId)
    .like("notification_key", `${prefix}%`);
  if (error) console.warn("[Email Automation] Could not release email key prefix:", error);
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export async function getRecipient(
  userId: string
): Promise<{ email: string; name: string } | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[Email Automation] Could not load recipient profile:", error);
    return null;
  }
  if (!data?.email) return null;
  return { email: data.email, name: data.full_name || "Contributor" };
}

/** Insert an in-app notification (matches the notifications table schema). Never throws. */
export async function createInAppNotification(
  userId: string,
  notification: { type: string; title: string; body?: string | null; href?: string | null }
) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("notifications").insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? null,
      href: notification.href ?? null,
    });
    if (error) console.warn("[Notifications] Insert failed:", error);
  } catch (err) {
    console.warn("[Notifications] Insert failed:", err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Onboarding progression                                                    */
/* -------------------------------------------------------------------------- */

export const KYC_APPROVED_STEP_KEY = "step_1_kyc_approved";

export async function notifyOnboardingProgress(params: {
  userId: string;
  email: string;
  name: string;
  stepKey: string;
  completedStepLabel: string;
  nextStepLabel: string | null;
  progressPercent: number;
  unlocksAssessment?: boolean;
}) {
  // 1. Step completion & next-step email
  await dispatchDeduplicatedEmail({
    userId: params.userId,
    to: params.email,
    notificationKey: `onboarding_step_${params.stepKey}`,
    subject: params.nextStepLabel
      ? `Completed: ${params.completedStepLabel} — Up Next: ${params.nextStepLabel}`
      : "Onboarding Complete — You're Ready to Start Tasking!",
    html: onboardingStepCompletedEmail(
      params.name,
      params.completedStepLabel,
      params.nextStepLabel,
      params.progressPercent
    ),
  });

  // 2. If this step unlocked the screening assessment, send the dedicated Assessment Ready email
  if (params.unlocksAssessment) {
    await dispatchDeduplicatedEmail({
      userId: params.userId,
      to: params.email,
      notificationKey: "assessment_unlocked_nudge",
      subject: "Your Screening Assessment is Unlocked — Revive AI",
      html: startAssessmentEmail(params.name, "Project Screening Assessment", 10),
    });
  }
}

export async function notifyAssessmentFailed(params: {
  userId: string;
  email: string;
  name: string;
  stepId: string;
  score: number;
  threshold: number;
}) {
  // One email per attempt day so repeated quick retries don't flood the inbox.
  const dayKey = new Date().toISOString().slice(0, 10);
  await dispatchDeduplicatedEmail({
    userId: params.userId,
    to: params.email,
    notificationKey: `assessment_failed_${params.stepId}_${dayKey}`,
    subject: "Your assessment result — you can retry",
    html: assessmentFailedEmail(params.name, params.score, params.threshold),
  });
}

/* -------------------------------------------------------------------------- */
/*  Waitlist admission                                                        */
/* -------------------------------------------------------------------------- */

export async function notifyAccountApproved(userId: string) {
  const recipient = await getRecipient(userId);
  if (!recipient) return;
  await dispatchDeduplicatedEmail({
    userId,
    to: recipient.email,
    notificationKey: "account_approved",
    subject: "You're approved — welcome to Revive AI",
    html: accountApprovedEmail(recipient.name),
  });
}

export async function notifyAccountRejected(userId: string, reason?: string | null) {
  const recipient = await getRecipient(userId);
  if (!recipient) return;
  await dispatchDeduplicatedEmail({
    userId,
    to: recipient.email,
    notificationKey: "account_rejected",
    subject: "An update on your Revive AI application",
    html: accountRejectedEmail(recipient.name, reason),
  });
}

/** One email per suspension; `suspendedAt` scopes it so a later re-suspension emails again. */
export async function notifyAccountSuspended(userId: string, suspendedAt: string) {
  const recipient = await getRecipient(userId);
  if (!recipient) return { success: false, error: "User has no email address." };
  return dispatchDeduplicatedEmail({
    userId,
    to: recipient.email,
    notificationKey: `account_suspended_${suspendedAt}`,
    subject: "Your Revive AI account has been deactivated",
    html: accountSuspendedEmail(),
  });
}

/* -------------------------------------------------------------------------- */
/*  KYC lifecycle                                                             */
/* -------------------------------------------------------------------------- */

export type KycEmailEvent =
  | "approved"
  | "submitted"
  | "rejected"
  | "resubmission_requested"
  | "reset";

/**
 * Emails the contributor about a KYC state change.
 * `referenceId` scopes deduplication (e.g. the Didit session id), so webhook
 * retries for the same session send once while a new attempt sends again.
 */
export async function notifyKycEvent(
  userId: string,
  event: KycEmailEvent,
  options: { referenceId?: string; note?: string | null; reasons?: string[] | null } = {}
) {
  const recipient = await getRecipient(userId);
  if (!recipient) return;
  const ref = options.referenceId || new Date().toISOString();

  if (event === "approved") {
    await notifyOnboardingProgress({
      userId,
      email: recipient.email,
      name: recipient.name,
      stepKey: KYC_APPROVED_STEP_KEY,
      completedStepLabel: "Identity Verification (KYC)",
      nextStepLabel: "Payments and Tax Setup (5m)",
      progressPercent: 17,
    });
    return;
  }

  // Any non-approved outcome re-opens the step, so a future approval should email again.
  if (event !== "submitted") {
    await releaseEmailKeys(userId, [`onboarding_step_${KYC_APPROVED_STEP_KEY}`]);
  }

  const subjects: Record<Exclude<KycEmailEvent, "approved">, string> = {
    submitted: "We've received your identity verification",
    rejected: "Your identity verification was declined",
    resubmission_requested: "Action needed: resubmit your identity verification",
    reset: "Your identity verification was reset",
  };

  await dispatchDeduplicatedEmail({
    userId,
    to: recipient.email,
    notificationKey: `kyc_${event}_${ref}`,
    subject: subjects[event],
    html: kycStatusEmail(recipient.name, event, options.note, options.reasons),
  });
}

/* -------------------------------------------------------------------------- */
/*  Project / task availability                                               */
/* -------------------------------------------------------------------------- */

function formatTaskPay(task: {
  pay_min?: number | null;
  pay_max?: number | null;
  pay_unit?: string | null;
}): string | null {
  const unit = task.pay_unit || "hour";
  if (task.pay_min && task.pay_max && task.pay_min !== task.pay_max) {
    return `$${task.pay_min}–$${task.pay_max}/${unit}`;
  }
  const value = task.pay_max || task.pay_min;
  return value ? `$${value}/${unit}` : null;
}

/**
 * Alerts every admitted contributor that a task is open for applications.
 * Deduplicated per task, so re-opening a task never re-sends.
 */
export async function notifyTaskOpened(taskId: string): Promise<number> {
  const adminClient = createAdminClient();
  const { data: task, error: taskError } = await adminClient
    .from("tasks")
    .select("id, slug, title, summary, pay_min, pay_max, pay_unit, status")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task || task.status !== "open") return 0;

  const { data: recipients, error } = await adminClient
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "user")
    .eq("approval_status", "approved");

  if (error) {
    console.error("[Email Automation] Could not load task alert recipients:", error);
    return 0;
  }

  // Skip contributors who already applied (e.g. task re-opened after edits).
  const { data: applicants } = await adminClient
    .from("applications")
    .select("user_id")
    .eq("task_id", taskId);
  const applied = new Set((applicants || []).map((a) => a.user_id));

  const payLabel = formatTaskPay(task);
  const emails: DedupedEmail[] = (recipients || [])
    .filter((p) => !applied.has(p.id))
    .map((p) => ({
      userId: p.id,
      to: p.email,
      notificationKey: `task_open_${task.id}`,
      subject: `New task open: ${task.title}`,
      html: newTaskAvailableEmail(p.full_name || "Contributor", {
        title: task.title,
        summary: task.summary,
        payLabel,
        slug: task.slug,
      }),
    }));

  return dispatchDeduplicatedEmails(emails);
}

export {
  finishProfileReminderEmail,
  projectAvailabilityReminderEmail,
  startAssessmentEmail,
  profileDetailsReminderEmail,
  formatTaskPay,
};

/* -------------------------------------------------------------------------- */
/*  Payouts                                                                   */
/* -------------------------------------------------------------------------- */

type SnapshotEntry = {
  kind: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
};

/**
 * Emails the contributor that a payout was sent, with the log of the earnings it
 * settles. Sent once per payout. Falls back to the ledger when the payout has no
 * stored snapshot (payouts processed from a contributor request).
 */
export async function notifyPayoutSent(payoutId: string) {
  const adminClient = createAdminClient();
  const { data: payout, error } = await adminClient
    .from("payout_requests")
    .select("*")
    .eq("id", payoutId)
    .maybeSingle();
  if (error || !payout || payout.status !== "paid") {
    if (error) console.error("[Email Automation] Could not load payout:", error);
    return;
  }

  const recipient = await getRecipient(payout.user_id);
  if (!recipient) return;

  let snapshot = (Array.isArray(payout.earnings_snapshot) ? payout.earnings_snapshot : []) as SnapshotEntry[];
  if (snapshot.length === 0) {
    const { data: previous } = await adminClient
      .from("ledger_entries")
      .select("created_at")
      .eq("user_id", payout.user_id)
      .eq("kind", "payout")
      .neq("ref_id", payout.id)
      .lt("created_at", payout.requested_at)
      .order("created_at", { ascending: false })
      .limit(1);
    let query = adminClient
      .from("ledger_entries")
      .select("kind, amount_cents, note, created_at")
      .eq("user_id", payout.user_id)
      .in("kind", ["earning", "bonus", "adjustment", "payout_reversal"])
      .lte("created_at", payout.requested_at)
      .order("created_at", { ascending: true });
    if (previous?.[0]) query = query.gt("created_at", previous[0].created_at);
    const { data } = await query;
    snapshot = (data || []) as SnapshotEntry[];
  }

  const { data: balanceRows } = await adminClient
    .from("ledger_entries")
    .select("amount_cents")
    .eq("user_id", payout.user_id);
  const remainingCents = (balanceRows || []).reduce((sum, r) => sum + Number(r.amount_cents), 0);

  const entries: PayoutEmailEntry[] = snapshot
    .slice()
    .reverse()
    .map((e) => ({
      date: e.created_at,
      description: e.note || "Approved work",
      kind: e.kind,
      amountCents: Number(e.amount_cents),
    }));

  const methodType = payout.method_snapshot?.type as string | undefined;
  const method =
    payout.provider ||
    (methodType && methodType !== "manual" ? methodType.charAt(0).toUpperCase() + methodType.slice(1) : null);

  await dispatchDeduplicatedEmail({
    userId: payout.user_id,
    to: recipient.email,
    notificationKey: `payout_sent_${payout.id}`,
    subject: `Payout sent: $${(Number(payout.amount_cents) / 100).toFixed(2)} — Revive AI`,
    html: payoutSentEmail({
      name: recipient.name,
      amountCents: Number(payout.amount_cents),
      method,
      reference: payout.provider_ref || "—",
      paidAt: payout.processed_at || new Date().toISOString(),
      note: payout.admin_note,
      entries,
      remainingCents,
    }),
  });
}
