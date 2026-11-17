import { createAdminClient } from "@/lib/supabase/server";
import { sendEmailSafe } from "@/lib/emails/resend"; // your resend file
import {
  onboardingStepCompletedEmail,
  startAssessmentEmail,
  finishProfileReminderEmail,
  projectAvailabilityReminderEmail,
} from "@/lib/emails/templates";

export async function dispatchDeduplicatedEmail(params: {
  userId: string;
  to: string;
  notificationKey: string;
  subject: string;
  html: string;
}) {
  const adminClient = createAdminClient();

  // Check if this exact notification was already sent
  const { data: existing } = await adminClient
    .from("email_notifications_log")
    .select("id")
    .eq("user_id", params.userId)
    .eq("notification_key", params.notificationKey)
    .maybeSingle();

  if (existing) {
    return { skipped: true };
  }

  const result = await sendEmailSafe({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (result.success) {
    await adminClient.from("email_notifications_log").insert({
      user_id: params.userId,
      notification_key: params.notificationKey,
    });
  }

  return result;
}

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
  // 1. Send step completion & next-step email
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

export {
  finishProfileReminderEmail,
  projectAvailabilityReminderEmail,
  startAssessmentEmail,
};