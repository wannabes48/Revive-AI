/**
 * The contributor onboarding checklist: step definitions and the strict linear
 * gate. Shared by the dashboard loader and the server actions so the server
 * enforces exactly the order the UI shows.
 */

export type OnboardingStepType =
  | "identity_kyc"
  | "tax_setup"
  | "terms_nda"
  | "timed_assessment"
  | "qualifications_check"
  | "tooling_check"
  | "next_steps";

export interface OnboardingStepState {
  id: string;
  index: number;
  title: string;
  estimatedMinutes: number;
  type: OnboardingStepType;
  status: "locked" | "available" | "in_review" | "completed" | "failed";
  badgeText?: string;
  subtext?: string;
  passingScore?: number;
  score?: number | null;
  /** Failed assessments: when the next attempt opens (ISO). */
  retryAvailableAt?: string | null;
  /** Assessments in progress: when the running attempt ends (ISO). */
  attemptExpiresAt?: string | null;
}

export type OnboardingProfileFields = {
  kyc_status?: string | null;
  terms_accepted_at?: string | null;
  payout_method_configured?: boolean | null;
};

export type OnboardingProgressRow = {
  step_id: string;
  status: string;
  score?: number | null;
  updated_at?: string | null;
  submitted_payload?: unknown;
};

type StepDefinition = {
  id: string;
  title: string;
  estimatedMinutes: number;
  type: OnboardingStepType;
  subtext: string;
  passingScore?: number;
  /** Label used in emails when this step completes. */
  label: string;
};

export const ONBOARDING_STEPS: StepDefinition[] = [
  {
    id: "step_1_kyc",
    title: "Confirm identity (2m)",
    estimatedMinutes: 2,
    type: "identity_kyc",
    subtext: "Biometric & ID verification powered by Didit.me.",
    label: "Identity Verification",
  },
  {
    id: "step_2_tax",
    title: "Payments and tax setup (5m)",
    estimatedMinutes: 5,
    type: "tax_setup",
    subtext: "Direct deposit setup and W-9 or W-8BEN form submission.",
    label: "Payments and Tax Setup",
  },
  {
    id: "step_3_terms",
    title: "Project Terms (2m)",
    estimatedMinutes: 2,
    type: "terms_nda",
    subtext: "Terms of service and confidential project non-disclosure agreement.",
    label: "Project Master Terms & NDA",
  },
  {
    id: "step_4_assessment_10m",
    title: "Project assessment (10m)",
    estimatedMinutes: 10,
    type: "timed_assessment",
    subtext: "Compare two model responses for instruction compliance and factual accuracy.",
    passingScore: 80,
    label: "Project Assessment (10m)",
  },
  {
    id: "step_4_assessment_120m",
    title: "Project assessment (120m)",
    estimatedMinutes: 120,
    type: "timed_assessment",
    subtext: "Code review, step-by-step reasoning and factual-claim verification.",
    passingScore: 85,
    label: "Project Assessment (120m)",
  },
  {
    id: "step_4_assessment_150m",
    title: "Project assessment (150m)",
    estimatedMinutes: 150,
    type: "timed_assessment",
    subtext: "Safety calibration: appropriate vs. unnecessary refusals, and confident false claims.",
    passingScore: 85,
    label: "Project Assessment (150m)",
  },
  {
    id: "step_5_tech",
    title: "Qualifications check (1m)",
    estimatedMinutes: 1,
    type: "qualifications_check",
    subtext: "Confirms your resume, primary expertise and skills are on your profile.",
    label: "Qualifications Check",
  },
  {
    id: "step_5_gsuite",
    title: "Google suite access check",
    estimatedMinutes: 2,
    type: "tooling_check",
    subtext: "The Google account we should share project documents and Slack invites with.",
    label: "Google Suite Access Check",
  },
  {
    id: "step_6_next",
    title: "Onboarding Next Steps (6m)",
    estimatedMinutes: 6,
    type: "next_steps",
    subtext: "Final readiness confirmation that unlocks your production tasks.",
    label: "Onboarding Next Steps",
  },
];

export function getStepDefinition(stepId: string) {
  return ONBOARDING_STEPS.find((s) => s.id === stepId) || null;
}

export function nextStepAfter(stepId: string) {
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
  return i >= 0 && i < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[i + 1] : null;
}

export function progressPercentAfter(stepId: string) {
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
  return Math.round(((i + 1) / ONBOARDING_STEPS.length) * 100);
}

function payloadField(payload: unknown, key: string): string | null {
  if (payload && typeof payload === "object" && key in payload) {
    const v = (payload as Record<string, unknown>)[key];
    return typeof v === "string" ? v : null;
  }
  return null;
}

/** Applies the linear gate: a step opens only after every earlier step is completed. */
export function resolveOnboardingSteps(
  profile: OnboardingProfileFields | null | undefined,
  progressRows: OnboardingProgressRow[],
  now: Date = new Date()
): OnboardingStepState[] {
  const kyc = profile?.kyc_status || "unverified";
  const progress = new Map(progressRows.map((p) => [p.step_id, p]));
  const steps: OnboardingStepState[] = [];
  let previousDone = true;

  ONBOARDING_STEPS.forEach((def, i) => {
    const row = progress.get(def.id);
    const openIfReady = previousDone ? "available" : "locked";
    let status: OnboardingStepState["status"] = "locked";
    let badgeText: string | undefined;
    let subtext = def.subtext;
    let retryAvailableAt: string | null = null;
    let attemptExpiresAt: string | null = null;

    switch (def.type) {
      case "identity_kyc":
        if (kyc === "verified" || row?.status === "completed") {
          status = "completed";
          badgeText = "Verified";
          subtext = "Identity verified.";
        } else if (kyc === "pending" || row?.status === "in_review") {
          status = "in_review";
          badgeText = "Pending review";
          subtext = "Your identity verification is in manual review.";
        } else {
          status = openIfReady;
          badgeText = "Start verification";
          if (kyc === "rejected") subtext = "Your previous verification was declined. Please try again.";
        }
        break;
      case "tax_setup":
        if (profile?.payout_method_configured || row?.status === "completed") {
          status = "completed";
          badgeText = "Completed";
        } else {
          status = openIfReady;
          badgeText = "Set up tax";
        }
        break;
      case "terms_nda":
        if (profile?.terms_accepted_at || row?.status === "completed") {
          status = "completed";
          badgeText = "Accepted";
        } else {
          status = openIfReady;
          badgeText = "Review terms";
        }
        break;
      case "timed_assessment":
        if (row?.status === "completed" || row?.status === "passed") {
          status = "completed";
          badgeText = `Passed (${row.score ?? 0}%)`;
        } else if (!previousDone) {
          status = "locked";
          badgeText = "Locked";
        } else if (row?.status === "failed") {
          status = "failed";
          retryAvailableAt = payloadField(row.submitted_payload, "retryAvailableAt");
          const waiting = retryAvailableAt && new Date(retryAvailableAt) > now;
          badgeText = waiting ? `Failed (${row.score ?? 0}%)` : "Retry";
          subtext = waiting
            ? `Scored ${row.score ?? 0}% (needs ${def.passingScore}%). You can retry after the cooldown.`
            : `Scored ${row.score ?? 0}% (needs ${def.passingScore}%). Your retry is open.`;
        } else if (row?.status === "in_progress") {
          status = "available";
          attemptExpiresAt = payloadField(row.submitted_payload, "expiresAt");
          badgeText = "Continue";
        } else {
          status = "available";
          badgeText = "Start";
        }
        break;
      default:
        if (row?.status === "completed") {
          status = "completed";
          badgeText = "Completed";
        } else {
          status = openIfReady;
          badgeText = def.type === "next_steps" ? "Finish" : "Start";
        }
    }

    steps.push({
      id: def.id,
      index: i + 1,
      title: def.title,
      estimatedMinutes: def.estimatedMinutes,
      type: def.type,
      status,
      badgeText,
      subtext,
      passingScore: def.passingScore,
      score: row?.score ?? null,
      retryAvailableAt,
      attemptExpiresAt,
    });

    previousDone = status === "completed";
  });

  return steps;
}

/** True when every step before `stepId` is completed. */
export function isStepUnlocked(steps: OnboardingStepState[], stepId: string): boolean {
  const i = steps.findIndex((s) => s.id === stepId);
  if (i < 0) return false;
  return steps.slice(0, i).every((s) => s.status === "completed");
}
