import { z } from "zod";

/** Referral program configuration, stored in app_settings (key = 'referral'). */
export interface ReferralSettings {
  enabled: boolean;
  referrer_reward_cents: number;
  referred_reward_cents: number;
  min_earned_cents: number;
  window_days: number;
  hold_days: number;
  max_rewards_per_referrer: number;
  auto_approve: boolean;
}

/** Mirrors the seed in supabase/010_referrals.sql. Used if the row can't be read. */
export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  enabled: false,
  referrer_reward_cents: 2500,
  referred_reward_cents: 1000,
  min_earned_cents: 5000,
  window_days: 60,
  hold_days: 7,
  max_rewards_per_referrer: 20,
  auto_approve: true,
};

/** Minimum profile completeness (%) before a contributor gets a referral link. */
export const REFERRAL_MIN_PROFILE_PERCENT = 50;

export const REFERRAL_COOKIE = "revive_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Codes are 10 uppercase alphanumerics (older accounts have 8). */
export const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9]{6,12}$/;

export function normalizeReferralCode(code: string | null | undefined): string | null {
  const trimmed = (code || "").trim();
  return REFERRAL_CODE_PATTERN.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function parseReferralSettings(value: unknown): ReferralSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const num = (key: keyof ReferralSettings) => {
    const n = Number(v[key]);
    return Number.isFinite(n) ? n : (DEFAULT_REFERRAL_SETTINGS[key] as number);
  };
  const bool = (key: keyof ReferralSettings) =>
    typeof v[key] === "boolean" ? (v[key] as boolean) : (DEFAULT_REFERRAL_SETTINGS[key] as boolean);

  return {
    enabled: bool("enabled"),
    referrer_reward_cents: num("referrer_reward_cents"),
    referred_reward_cents: num("referred_reward_cents"),
    min_earned_cents: num("min_earned_cents"),
    window_days: num("window_days"),
    hold_days: num("hold_days"),
    max_rewards_per_referrer: num("max_rewards_per_referrer"),
    auto_approve: bool("auto_approve"),
  };
}

/** Validation for the admin settings form (amounts entered in dollars). */
export const referralSettingsFormSchema = z.object({
  enabled: z.boolean(),
  referrer_reward_dollars: z.number().min(0, "Must be 0 or more").max(1000, "Max $1,000"),
  referred_reward_dollars: z.number().min(0, "Must be 0 or more").max(1000, "Max $1,000"),
  min_earned_dollars: z.number().min(1, "Must be at least $1").max(100000),
  window_days: z.number().int().min(1, "At least 1 day").max(365, "Max 365 days"),
  hold_days: z.number().int().min(0, "0 or more days").max(90, "Max 90 days"),
  max_rewards_per_referrer: z.number().int().min(0, "0 or more").max(10000),
  auto_approve: z.boolean(),
});
export type ReferralSettingsForm = z.infer<typeof referralSettingsFormSchema>;

export type ReferralStatus = "pending" | "qualified" | "rewarded" | "rejected";

export interface MyReferralRow {
  id: string;
  display_name: string;
  status: ReferralStatus;
  flag_reason: string | null;
  earned_cents: number;
  created_at: string;
}

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: "In progress",
  qualified: "Under review",
  rewarded: "Rewarded",
  rejected: "Not eligible",
};

/** Plain-language reasons. Contributor-facing text never mentions fraud signals. */
export function referralReasonForContributor(reason: string | null | undefined): string {
  if (reason === "window_expired") return "Time limit passed";
  return "Did not meet the program terms";
}

export const REFERRAL_FLAG_LABELS: Record<string, string> = {
  cap_reached: "Referrer reached the reward cap",
  shared_payout_method: "Shares a payout method with the referrer",
  referrer_payouts_blocked: "Referrer's payouts are blocked",
  window_expired: "Qualification window expired",
  admin_rejected: "Rejected by admin",
};

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Pre-filled share text: plain, no earnings claims. */
export const REFERRAL_SHARE_MESSAGE = "I do paid AI evaluation tasks on Revive AI. Join with my link:";
