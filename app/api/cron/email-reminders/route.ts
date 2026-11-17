import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  dispatchDeduplicatedEmail,
  finishProfileReminderEmail,
  projectAvailabilityReminderEmail,
  startAssessmentEmail,
} from "@/lib/emails/automation";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Email reminders cron is unavailable because CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Cron secret is not configured." }, { status: 500 });
  }

  if (req.headers.get("authorization") !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select(
      "id, email, full_name, kyc_status, payout_method_configured, terms_accepted_at, created_at"
    )
    .lt("created_at", twentyFourHoursAgo);

  if (profilesError) {
    console.error("Could not fetch profiles for email reminders:", profilesError);
    return NextResponse.json({ error: "Could not fetch profiles." }, { status: 500 });
  }

  const { data: openProjects, error: projectsError } = await adminClient
    .from("projects")
    .select("id, title, rate_cents_per_hour, rate_cents_per_task, description")
    .eq("status", "active")
    .limit(3);

  if (projectsError) {
    console.error("Could not fetch active projects for email reminders:", projectsError);
    return NextResponse.json({ error: "Could not fetch active projects." }, { status: 500 });
  }

  const formattedProjects = (openProjects || []).map((project) => ({
    title: project.title,
    rateLabel: project.rate_cents_per_hour
      ? `$${(project.rate_cents_per_hour / 100).toFixed(0)}/hr`
      : `$${((project.rate_cents_per_task || 1000) / 100).toFixed(0)}/task`,
    description: project.description,
  }));

  let sentCount = 0;

  for (const profile of profiles || []) {
    if (!profile.email) continue;
    const name = profile.full_name || "Contributor";

    const missing: string[] = [];
    if (profile.kyc_status !== "verified") missing.push("Identity Verification (KYC)");
    if (!profile.payout_method_configured) missing.push("Payments & Tax Setup");
    if (!profile.terms_accepted_at) missing.push("Project Master Terms & NDA");

    if (missing.length > 0) {
      const result = await dispatchDeduplicatedEmail({
        userId: profile.id,
        to: profile.email,
        notificationKey: "reminder_finish_profile_24h",
        subject: "Finish your Revive AI profile to unlock projects",
        html: finishProfileReminderEmail(name, missing),
      });
      if ("success" in result && result.success) sentCount++;
      continue;
    }

    const { data: assessmentProgress, error: progressError } = await adminClient
      .from("fellow_onboarding_progress")
      .select("status")
      .eq("user_id", profile.id)
      .like("step_id", "step_4_assessment%")
      .eq("status", "completed")
      .limit(1);

    if (progressError) {
      console.error(`Could not fetch assessment progress for user ${profile.id}:`, progressError);
      return NextResponse.json({ error: "Could not fetch assessment progress." }, { status: 500 });
    }

    if (!assessmentProgress || assessmentProgress.length === 0) {
      const result = await dispatchDeduplicatedEmail({
        userId: profile.id,
        to: profile.email,
        notificationKey: "reminder_start_assessment_48h",
        subject: "Reminder: Your screening assessment is waiting — Revive AI",
        html: startAssessmentEmail(name, "Project Screening Assessment", 10),
      });
      if ("success" in result && result.success) sentCount++;
      continue;
    }

    if (formattedProjects.length > 0) {
      const dayKey = new Date().toISOString().slice(0, 10);
      const result = await dispatchDeduplicatedEmail({
        userId: profile.id,
        to: profile.email,
        notificationKey: `project_availability_${dayKey}`,
        subject: "New AI evaluation projects available for your profile — Revive AI",
        html: projectAvailabilityReminderEmail(name, formattedProjects),
      });
      if ("success" in result && result.success) sentCount++;
    }
  }

  return NextResponse.json({ success: true, emailsDispatched: sentCount });
}
