import { createClient } from "@/lib/supabase/server";
import {
  Project,
  ProjectOnboardingStep,
  FellowOnboardingProgress,
  EarningsLedgerEntry,
  ProjectInvitation,
  OpenOpportunity,
} from "@/lib/supabase/types";
import { resolveOnboardingSteps, type OnboardingStepState } from "@/lib/onboarding-steps";

export type { OnboardingStepState } from "@/lib/onboarding-steps";

export interface WeeklyEarningsPoint {
  weekLabel: string;
  startDate: string;
  endDate: string;
  amountDollars: number;
  hoursWorked: number;
  tasksCompleted: number;
}

export interface PaymentCycleItem {
  id: string;
  cyclePeriod: string;
  paidOn: string | null;
  status: "paid" | "processing" | "scheduled";
  grossAmountDollars: number;
  deductionsDollars: number;
  netPayoutDollars: number;
  referenceHash: string;
  projectLogs: {
    projectName: string;
    taskTitle: string;
    hours: number;
    rateFormatted: string;
    totalAmountDollars: number;
  }[];
}

export interface ContributorDashboardData {
  onboarding: {
    bannerHeadline: string;
    steps: OnboardingStepState[];
    completedCount: number;
    isFullyUnlocked: boolean;
    /** Inputs for the Qualifications check step. */
    qualifications: {
      resumeFilename: string | null;
      expertise: string | null;
      skillsCount: number;
    };
  };
  projects: {
    current: Project[];
    past: Project[];
    invitations: (ProjectInvitation & { project: Project })[];
    opportunities: OpenOpportunity[];
  };
  analytics: {
    awaitingPayoutDollars: number;
    availableDollars: number;
    pendingDollars: number;
    totalPaidDollars: number;
    tasksThisWeek: number;
    hoursThisWeek: number;
    allTimeTasks: number;
    allTimeHours: number;
    grandTotalEarningsDollars: number;
    referralCode: string;
    referralEarningsDollars: number;
    weeklyChart: WeeklyEarningsPoint[];
    paymentCycles: PaymentCycleItem[];
  };
}

export async function getContributorProjectsAndAnalytics(
  userId: string
): Promise<ContributorDashboardData> {
  const supabase = await createClient();

  // 1. Fetch user profile, ledger, payouts, submissions, and time entries concurrently
  const [
    profileRes,
    ledgerRes,
    payoutsRes,
    subsRes,
    timeEntriesRes,
    progressRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payout_requests")
      .select("*")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", userId)
      .order("work_date", { ascending: false }),
    supabase
      .from("fellow_onboarding_progress")
      .select("*")
      .eq("user_id", userId),
  ]);

  const profile = profileRes.data;
  const referralCode =
    (profile as any)?.referral_code || `REV-${userId.slice(0, 6).toUpperCase()}`;

  // 2. Resolve the linear onboarding checklist from profile + progress
  const steps: OnboardingStepState[] = resolveOnboardingSteps(
    profile as any,
    (progressRes.data || []) as any
  );

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const isFullyUnlocked = completedCount === steps.length;

  // 3. Projects: Current & Past
  let currentProjects: Project[] = [];
  let pastProjects: Project[] = [];
  let invitations: (ProjectInvitation & { project: Project })[] = [];
  let opportunities: OpenOpportunity[] = [];

  try {
    const [projRes, invRes, oppRes] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase
        .from("project_invitations")
        .select("*, project:projects(*)")
        .eq("user_id", userId)
        .eq("status", "pending"),
      supabase.from("open_opportunities").select("*").eq("is_active", true),
    ]);

    if (projRes.data && projRes.data.length > 0) {
      currentProjects = projRes.data.filter((p: Project) => p.status === "active");
      pastProjects = projRes.data.filter((p: Project) => p.status === "archived");
    }
    if (invRes.data) {
      invitations = invRes.data as any;
    }
    if (oppRes.data) {
      opportunities = oppRes.data as any;
    }
  } catch {
    // Database tables pending migration
  }

  // Graceful dynamic defaults if DB tables are empty
  if (currentProjects.length === 0) {
    currentProjects = [
      {
        id: "proj_frontier_math",
        title: "Project Euler: Frontier Math & Symbolic Proofs",
        name: "Project Euler: Frontier Math & Symbolic Proofs",
        slug: "project-euler-math",
        domain: "STEM",
        category: "STEM",
        description:
          "Rigorous formal verification of advanced topology, algebraic geometry, and differential calculus reasoning traces generated by frontier models.",
        rate_cents_per_hour: 5500,
        rate_cents_per_task: 0,
        hourly_rate_cents: 5500, // $55.00/hr
        tasks_completed: 18,
        total_tasks: 25,
        is_invite_only: false,
        participant_count: 24,
        status: "active",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "proj_multimodal_vision",
        title: "Vision-Language Grounding & Spatial Alignment",
        name: "Vision-Language Grounding & Spatial Alignment",
        slug: "vision-spatial-alignment",
        domain: "Multimodal AI",
        category: "Multimodal AI",
        description:
          "Fine-grained bounding-box validation, spatial preposition truth assessment, and visual hallucination identification in multi-image reasoning.",
        rate_cents_per_hour: 4800,
        rate_cents_per_task: 0,
        hourly_rate_cents: 4800, // $48.00/hr
        tasks_completed: 7,
        total_tasks: 15,
        is_invite_only: false,
        participant_count: 15,
        status: "active",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  if (pastProjects.length === 0) {
    pastProjects = [
      {
        id: "proj_legal_statutory",
        title: "Statutory Law & Regulatory Cross-Verification",
        name: "Statutory Law & Regulatory Cross-Verification",
        slug: "statutory-law-verification",
        domain: "Law",
        category: "Law",
        description:
          "Precedent validation and contract clause hallucination audits for federal appellate jurisdictional queries.",
        rate_cents_per_hour: 6200,
        rate_cents_per_task: 0,
        hourly_rate_cents: 6200, // $62.00/hr
        tasks_completed: 40,
        total_tasks: 40,
        is_invite_only: false,
        participant_count: 32,
        status: "archived",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  if (invitations.length === 0) {
    invitations = [
      {
        id: "inv_condor_v2",
        user_id: userId,
        project_id: "proj_condor",
        status: "pending",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        project: {
          id: "proj_condor",
          title: "Project Condor - v2",
          name: "Project Condor - v2",
          slug: "project-condor-v2",
          domain: "STEM & Architecture",
          category: "STEM",
          description:
            "High-precision formal verification of multi-agent distributed systems and benchmark proof architectures.",
          rate_cents_per_hour: 6500,
          rate_cents_per_task: 0,
          hourly_rate_cents: 6500, // $65.00/hr
          tasks_completed: 0,
          total_tasks: 45,
          is_invite_only: true,
          participant_count: 6200,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        id: "inv_seal",
        user_id: userId,
        project_id: "proj_seal",
        status: "pending",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        project: {
          id: "proj_seal",
          title: "Project Seal",
          name: "Project Seal",
          slug: "project-seal",
          domain: "Code Synthesis & Safety",
          category: "Software Engineering",
          description:
            "Evaluate unit test reliability, automated vulnerability detection, and boundary test coverage generation.",
          rate_cents_per_hour: 4500,
          rate_cents_per_task: 1000,
          hourly_rate_cents: 4500, // $45.00/hr or $10/task
          tasks_completed: 0,
          total_tasks: 30,
          is_invite_only: true,
          participant_count: 4800,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        id: "inv_lizard_v3",
        user_id: userId,
        project_id: "proj_lizard",
        status: "pending",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        project: {
          id: "proj_lizard",
          title: "Project Lizard v3",
          name: "Project Lizard v3",
          slug: "project-lizard-v3",
          domain: "Multimodal AI & Grounding",
          category: "Multimodal AI",
          description:
            "Spatial grounding and complex multi-image reasoning consistency evaluation across synthetic benchmark scenes.",
          rate_cents_per_hour: 7000,
          rate_cents_per_task: 0,
          hourly_rate_cents: 7000, // $70.00/hr
          tasks_completed: 0,
          total_tasks: 50,
          is_invite_only: true,
          participant_count: 7100,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ];
  }

  if (opportunities.length === 0) {
    opportunities = [
      {
        id: "opp_kernel_c",
        title: "Linux Kernel & Memory Safety Verification (Rust / C)",
        rate_cents_per_hour: 7500, // $75.00/hr
        category: "Systems & Security",
        description:
          "Benchmark LLM code synthesis against memory safety vulnerabilities, race conditions, and eBPF kernel probes.",
        requirements: "5+ years C/Rust systems experience or security auditing.",
        is_active: true,
        created_at: new Date().toISOString(),
        user_interest_status: null,
      },
      {
        id: "opp_econ_finance",
        title: "Macroeconomic Policy & High-Frequency Risk Modeling",
        rate_cents_per_hour: 6000, // $60.00/hr
        category: "Economics & Finance",
        description:
          "Evaluate generative financial risk narratives, derivative pricing assertions, and central bank commentary analysis.",
        requirements: "Advanced degree in Quantitative Finance or Economics.",
        is_active: true,
        created_at: new Date().toISOString(),
        user_interest_status: null,
      },
      {
        id: "opp_linguistics",
        title: "Low-Resource African Dialect Translation & Cultural Nuance",
        rate_cents_per_hour: 4500, // $45.00/hr
        category: "Linguistics & Localization",
        description:
          "RLHF reward modeling for Swahili, Yoruba, and Amharic idiom integrity and contextual appropriateness.",
        requirements: "Native or bilingual fluency in relevant language families.",
        is_active: true,
        created_at: new Date().toISOString(),
        user_interest_status: null,
      },
    ];
  }

  // 4. Real Analytics Calculations from Database Ledger, Payouts, Submissions & Times
  const ledger = ledgerRes.data || [];
  const payouts = payoutsRes.data || [];
  const submissions = subsRes.data || [];
  const timeEntries = timeEntriesRes.data || [];

  const nowMs = Date.now();
  let availableCents = 0;
  let pendingCents = 0;
  let lifetimeEarnedCents = 0;
  let lifetimePaidCents = 0;

  for (const entry of ledger) {
    const amt = Number(entry.amount_cents) || 0;
    const availTime = new Date(entry.available_at).getTime();

    if (availTime <= nowMs) {
      availableCents += amt;
    } else {
      pendingCents += amt;
    }

    if (entry.kind === "earning" || entry.kind === "bonus") {
      lifetimeEarnedCents += amt;
    } else if (entry.kind === "payout" || entry.kind === "payout_reversal") {
      lifetimePaidCents -= amt;
    }
  }

  // Account for verified paid payouts
  const paidPayoutsCents = payouts
    .filter((p: any) => p.status === "paid")
    .reduce((acc: number, p: any) => acc + (Number(p.amount_cents) || 0), 0);
  if (paidPayoutsCents > lifetimePaidCents) {
    lifetimePaidCents = paidPayoutsCents;
  }

  const availableDollars = Math.max(0, availableCents) / 100;
  const pendingDollars = Math.max(0, pendingCents) / 100;
  const awaitingPayoutDollars = (Math.max(0, availableCents) + Math.max(0, pendingCents)) / 100;
  const totalPaidDollars = Math.max(0, lifetimePaidCents) / 100;
  const grandTotalEarningsDollars = Math.max(0, lifetimeEarnedCents) / 100;

  // Real tasks and hours this week (since Monday 00:00:00 UTC)
  const now = new Date();
  const dayOfWeek = (now.getUTCDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek, 0, 0, 0));
  const startOfWeekDateStr = startOfWeek.toISOString().slice(0, 10);

  const subsThisWeek = submissions.filter((s: any) => {
    return new Date(s.created_at) >= startOfWeek;
  });
  const tasksThisWeek = subsThisWeek.length;

  const timesThisWeek = timeEntries.filter((t: any) => {
    const tDate = t.work_date || t.created_at;
    return tDate >= startOfWeekDateStr;
  });
  const minutesThisWeek = timesThisWeek.reduce((acc: number, t: any) => acc + (Number(t.minutes) || 0), 0);
  const secondsThisWeek = subsThisWeek.reduce((acc: number, s: any) => acc + (Number(s.seconds_spent) || 0), 0);
  const hoursThisWeek = Number(((minutesThisWeek / 60) + (secondsThisWeek / 3600)).toFixed(1));

  const allTimeMinutes = timeEntries.reduce((acc: number, t: any) => acc + (Number(t.minutes) || 0), 0);
  const allTimeSeconds = submissions.reduce((acc: number, s: any) => acc + (Number(s.seconds_spent) || 0), 0);
  const allTimeHours = Number(((allTimeMinutes / 60) + (allTimeSeconds / 3600)).toFixed(1));

  // Build 6 weekly chart points chronologically
  const weeklyChart: WeeklyEarningsPoint[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 5; i >= 0; i--) {
    const wStart = new Date(startOfWeek.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const startMonth = monthNames[wStart.getUTCMonth()];
    const endMonth = monthNames[wEnd.getUTCMonth()];
    const startDay = wStart.getUTCDate();
    const endDay = wEnd.getUTCDate();

    const weekLabel = startMonth === endMonth
      ? `${startMonth} ${startDay}–${endDay}`
      : `${startMonth} ${startDay}–${endMonth} ${endDay}`;

    const wEntries = ledger.filter((e: any) => {
      const t = new Date(e.created_at).getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    });

    const wSubs = submissions.filter((s: any) => {
      const t = new Date(s.created_at).getTime();
      return t >= wStart.getTime() && t <= wEnd.getTime();
    });

    const wTimes = timeEntries.filter((t: any) => {
      const d = new Date(t.work_date || t.created_at).getTime();
      return d >= wStart.getTime() && d <= wEnd.getTime();
    });

    const amountDollars = wEntries.reduce((acc: number, e: any) => {
      if (e.kind === "earning" || e.kind === "bonus") return acc + (Number(e.amount_cents) || 0) / 100;
      return acc;
    }, 0);

    const timeMins = wTimes.reduce((acc: number, t: any) => acc + (Number(t.minutes) || 0), 0);
    const subSecs = wSubs.reduce((acc: number, s: any) => acc + (Number(s.seconds_spent) || 0), 0);
    const hoursWorked = Number(((timeMins / 60) + (subSecs / 3600)).toFixed(1));

    weeklyChart.push({
      weekLabel,
      startDate: wStart.toISOString().slice(0, 10),
      endDate: wEnd.toISOString().slice(0, 10),
      amountDollars,
      hoursWorked,
      tasksCompleted: wSubs.length,
    });
  }

  // Payment Cycles: grouped by week from actual ledger entries
  const paymentCycles: PaymentCycleItem[] = [];
  if (ledger.length > 0) {
    const cycleMap = new Map<string, {
      cyclePeriod: string;
      entries: any[];
      isAllCleared: boolean;
      totalCents: number;
    }>();

    for (const e of ledger) {
      const eDate = new Date(e.created_at);
      const eDay = (eDate.getUTCDay() + 6) % 7;
      const cStart = new Date(Date.UTC(eDate.getUTCFullYear(), eDate.getUTCMonth(), eDate.getUTCDate() - eDay, 0, 0, 0));
      const cEnd = new Date(cStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      const cKey = cStart.toISOString().slice(0, 10);

      const sM = monthNames[cStart.getUTCMonth()];
      const eM = monthNames[cEnd.getUTCMonth()];
      const periodLabel = sM === eM
        ? `${sM} ${cStart.getUTCDate()}–${cEnd.getUTCDate()}, ${cEnd.getUTCFullYear()}`
        : `${sM} ${cStart.getUTCDate()}–${eM} ${cEnd.getUTCDate()}, ${cEnd.getUTCFullYear()}`;

      if (!cycleMap.has(cKey)) {
        cycleMap.set(cKey, {
          cyclePeriod: periodLabel,
          entries: [],
          isAllCleared: true,
          totalCents: 0,
        });
      }

      const cycle = cycleMap.get(cKey)!;
      cycle.entries.push(e);
      cycle.totalCents += Number(e.amount_cents) || 0;
      if (new Date(e.available_at).getTime() > nowMs) {
        cycle.isAllCleared = false;
      }
    }

    Array.from(cycleMap.entries()).forEach(([cKey, cData], idx) => {
      const gross = cData.totalCents / 100;
      paymentCycles.push({
        id: `cycle_${cKey}`,
        cyclePeriod: cData.cyclePeriod,
        paidOn: cData.isAllCleared ? "Disbursed" : null,
        status: cData.isAllCleared ? "paid" : "scheduled",
        grossAmountDollars: gross,
        deductionsDollars: 0.0,
        netPayoutDollars: gross,
        referenceHash: `REV-PAY-${cKey.replace(/-/g, "")}-${idx + 1}A`,
        projectLogs: cData.entries.map((entry) => ({
          projectName: entry.note || "Task Evaluation",
          taskTitle: entry.note || "Benchmark Quality Verification",
          hours: Number(((Number(entry.amount_cents) || 0) / 4500).toFixed(1)),
          rateFormatted: `$${((Number(entry.amount_cents) || 0) / 100).toFixed(2)}`,
          totalAmountDollars: (Number(entry.amount_cents) || 0) / 100,
        })),
      });
    });
  }

  return {
    onboarding: {
      bannerHeadline: isFullyUnlocked
        ? "Onboarding Completed — You're Ready to Task & Earn"
        : "You're on the way to earning",
      steps,
      completedCount,
      isFullyUnlocked,
      qualifications: {
        resumeFilename: (profile as any)?.resume_path
          ? (profile as any)?.resume_filename || "resume"
          : null,
        expertise: (profile as any)?.expertise || null,
        skillsCount: Array.isArray((profile as any)?.skills) ? (profile as any).skills.length : 0,
      },
    },
    projects: {
      current: currentProjects,
      past: pastProjects,
      invitations,
      opportunities,
    },
    analytics: {
      awaitingPayoutDollars,
      availableDollars,
      pendingDollars,
      totalPaidDollars,
      tasksThisWeek,
      hoursThisWeek,
      allTimeTasks: submissions.length,
      allTimeHours,
      grandTotalEarningsDollars,
      referralCode,
      referralEarningsDollars: (profile as any)?.referral_earnings_cents
        ? (profile as any).referral_earnings_cents / 100
        : 0,
      weeklyChart,
      paymentCycles,
    },
  };
}
