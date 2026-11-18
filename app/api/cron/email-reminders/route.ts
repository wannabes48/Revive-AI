import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  dispatchDeduplicatedEmails,
  finishProfileReminderEmail,
  formatTaskPay,
  profileDetailsReminderEmail,
  projectAvailabilityReminderEmail,
  startAssessmentEmail,
  type DedupedEmail,
} from "@/lib/emails/automation";
import { profileCompleteness } from "@/lib/profile";
import type { Profile } from "@/types";

// Large contributor bases can take a while to process.
export const maxDuration = 300;

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

/** Reminder cadence (days after the baseline). Each stage is sent at most once. */
const ONBOARDING_STAGES = [1, 3, 7, 14];
const ASSESSMENT_STAGES = [1, 3, 7];
const PROFILE_DETAILS_STAGES = [5, 21];
const PROFILE_DETAILS_THRESHOLD = 70; // % completeness below which we nudge

/** The latest stage the user has reached, or null if none yet. */
function reachedStage(daysSince: number, stages: number[]): number | null {
  let reached: number | null = null;
  for (const stage of stages) if (daysSince >= stage) reached = stage;
  return reached;
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

type ProgressRow = { user_id: string; step_id: string; status: string; updated_at: string };

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
  const now = new Date();

  // 1. Admitted contributors only — waitlisted/rejected users and admins get no nudges.
  const profiles: (Profile & { approved_at?: string | null; created_at: string })[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "user")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Could not fetch profiles for email reminders:", error);
      return NextResponse.json({ error: "Could not fetch profiles." }, { status: 500 });
    }
    profiles.push(...((data || []) as typeof profiles));
    if (!data || data.length < PAGE_SIZE) break;
  }

  // 2. Onboarding progress for all of them, in bulk.
  const progressByUser = new Map<string, ProgressRow[]>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await adminClient
      .from("fellow_onboarding_progress")
      .select("user_id, step_id, status, updated_at")
      .or("step_id.in.(step_1_kyc,step_2_tax,step_3_terms),step_id.like.step_4_assessment%")
      .order("updated_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Could not fetch onboarding progress for email reminders:", error);
      return NextResponse.json({ error: "Could not fetch onboarding progress." }, { status: 500 });
    }
    for (const row of (data || []) as ProgressRow[]) {
      const list = progressByUser.get(row.user_id) || [];
      list.push(row);
      progressByUser.set(row.user_id, list);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  // 3. What opened in the last 7 days (for the weekly "new work" digest).
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const [{ data: newTasks, error: tasksError }, { data: newProjects, error: projectsError }] =
    await Promise.all([
      adminClient
        .from("tasks")
        .select("id, slug, title, summary, pay_min, pay_max, pay_unit")
        .eq("status", "open")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(10),
      adminClient
        .from("projects")
        .select("id, title, rate_cents_per_hour, rate_cents_per_task, description")
        .eq("status", "active")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
  if (tasksError) console.warn("Could not fetch new tasks for digest:", tasksError);
  if (projectsError) console.warn("Could not fetch new projects for digest:", projectsError);

  const appliedByUser = new Map<string, Set<string>>();
  const newTaskIds = (newTasks || []).map((t) => t.id);
  if (newTaskIds.length > 0) {
    const { data: apps } = await adminClient
      .from("applications")
      .select("user_id, task_id")
      .in("task_id", newTaskIds);
    for (const app of apps || []) {
      const set = appliedByUser.get(app.user_id) || new Set<string>();
      set.add(app.task_id);
      appliedByUser.set(app.user_id, set);
    }
  }

  const projectCards = (newProjects || []).map((project) => ({
    title: project.title,
    rateLabel: project.rate_cents_per_hour
      ? `$${(project.rate_cents_per_hour / 100).toFixed(0)}/hr`
      : `$${((project.rate_cents_per_task || 1000) / 100).toFixed(0)}/task`,
    description: project.description,
  }));

  // Profile-detail nudges are optional, so once sent they must not block the digest.
  const sentProfileNudges = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await adminClient
      .from("email_notifications_log")
      .select("user_id, notification_key")
      .like("notification_key", "reminder_profile_details_%")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn("Could not load sent profile nudges:", error);
      break;
    }
    for (const row of data || []) sentProfileNudges.add(`${row.user_id}::${row.notification_key}`);
    if (!data || data.length < PAGE_SIZE) break;
  }

  // 4. Decide at most ONE email per contributor per run, in journey order.
  const outgoing: DedupedEmail[] = [];
  const counts = { onboarding: 0, assessment: 0, profile: 0, digest: 0 };
  const weekKey = isoWeekKey(now);

  for (const profile of profiles) {
    if (!profile.email) continue;
    const name = profile.full_name || "Contributor";
    const progress = progressByUser.get(profile.id) || [];
    const step = (id: string) => progress.find((p) => p.step_id === id);
    const baseline = new Date(profile.approved_at || profile.created_at);
    const daysSinceAdmission = (now.getTime() - baseline.getTime()) / DAY_MS;

    // 4a. Required onboarding steps.
    const kycStatus = profile.kyc_status || "unverified";
    const taxDone =
      Boolean(profile.payout_method_configured) || step("step_2_tax")?.status === "completed";
    const termsDone =
      Boolean(profile.terms_accepted_at) || step("step_3_terms")?.status === "completed";

    const missing: string[] = [];
    if (kycStatus === "rejected") missing.push("Identity Verification (KYC) — please resubmit");
    else if (kycStatus !== "verified" && kycStatus !== "pending")
      missing.push("Identity Verification (KYC)");
    if (!taxDone) missing.push("Payments & Tax Setup");
    if (!termsDone) missing.push("Project Master Terms & NDA");

    if (missing.length > 0) {
      const stage = reachedStage(daysSinceAdmission, ONBOARDING_STAGES);
      if (stage !== null) {
        outgoing.push({
          userId: profile.id,
          to: profile.email,
          notificationKey: `reminder_onboarding_d${stage}`,
          subject:
            stage >= 7
              ? "Your Revive AI onboarding is still incomplete"
              : "Finish your Revive AI onboarding to unlock projects",
          html: finishProfileReminderEmail(name, missing),
        });
        counts.onboarding++;
      }
      continue;
    }

    // KYC under review is the only blocker — nothing for the contributor to do.
    if (kycStatus !== "verified") continue;

    // 4b. Screening assessment.
    const assessments = progress.filter((p) => p.step_id.startsWith("step_4_assessment"));
    const passed = assessments.some((p) => p.status === "completed" || p.status === "passed");

    if (!passed) {
      const termsRow = step("step_3_terms");
      const unlockedAt = termsRow ? new Date(termsRow.updated_at) : baseline;
      const daysSinceUnlock = (now.getTime() - unlockedAt.getTime()) / DAY_MS;
      const stage = reachedStage(daysSinceUnlock, ASSESSMENT_STAGES);
      if (stage !== null) {
        const failedBefore = assessments.some((p) => p.status === "failed");
        outgoing.push({
          userId: profile.id,
          to: profile.email,
          notificationKey: `reminder_assessment_d${stage}`,
          subject: failedBefore
            ? "Ready for another try? Your assessment retry is open"
            : "Reminder: your screening assessment is waiting",
          html: startAssessmentEmail(name, "Project Screening Assessment", 10),
        });
        counts.assessment++;
      }
      continue;
    }

    // 4c. Profile details (bio, skills, experience) — improves project matching.
    const completeness = profileCompleteness(profile as Profile);
    if (completeness.percentage < PROFILE_DETAILS_THRESHOLD) {
      const stage = reachedStage(daysSinceAdmission, PROFILE_DETAILS_STAGES);
      const key = `reminder_profile_details_d${stage}`;
      if (stage !== null && !sentProfileNudges.has(`${profile.id}::${key}`)) {
        outgoing.push({
          userId: profile.id,
          to: profile.email,
          notificationKey: key,
          subject: "Complete your profile to get matched to more projects",
          html: profileDetailsReminderEmail(
            name,
            completeness.percentage,
            completeness.missing.slice(0, 5).map((m) => m.label)
          ),
        });
        counts.profile++;
        continue; // one email per contributor per run
      }
    }

    // 4d. Weekly digest of work that opened this week and the user hasn't applied to.
    const applied = appliedByUser.get(profile.id);
    const taskCards = (newTasks || [])
      .filter((t) => !applied?.has(t.id))
      .slice(0, 3)
      .map((t) => ({
        title: t.title,
        rateLabel: formatTaskPay(t) || "Paid",
        description: t.summary,
      }));
    const cards = [...taskCards, ...projectCards].slice(0, 4);

    if (cards.length > 0) {
      outgoing.push({
        userId: profile.id,
        to: profile.email,
        notificationKey: `digest_new_work_${weekKey}`,
        subject: "New AI evaluation work opened this week — Revive AI",
        html: projectAvailabilityReminderEmail(name, cards),
      });
      counts.digest++;
    }
  }

  // 5. Send (already-sent stages are skipped by the dedupe log).
  const delivered = await dispatchDeduplicatedEmails(outgoing);

  return NextResponse.json({
    success: true,
    contributorsScanned: profiles.length,
    candidates: counts,
    emailsDispatched: delivered,
  });
}
