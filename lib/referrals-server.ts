import type { SupabaseClient } from "@supabase/supabase-js";
import { profileCompleteness } from "@/lib/profile";
import { getPublicSiteUrl } from "@/lib/site-url";
import type { Profile } from "@/lib/supabase/types";
import {
  DEFAULT_REFERRAL_SETTINGS,
  REFERRAL_MIN_PROFILE_PERCENT,
  parseReferralSettings,
  type MyReferralRow,
  type ReferralSettings,
} from "@/lib/referrals";

export async function getReferralSettings(supabase: SupabaseClient): Promise<ReferralSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "referral")
    .maybeSingle();
  if (error) {
    console.warn("Could not read referral settings (is migration 010 applied?):", error.message);
    return DEFAULT_REFERRAL_SETTINGS;
  }
  return parseReferralSettings(data?.value);
}

export function referralLink(code: string): string {
  return `${getPublicSiteUrl()}/r/${encodeURIComponent(code)}`;
}

export interface ReferralSummary {
  settings: ReferralSettings;
  code: string | null;
  link: string | null;
  unlocked: boolean;
  profilePercent: number;
  referrals: MyReferralRow[];
  stats: {
    invited: number;
    inProgress: number;
    qualified: number;
    rewarded: number;
    earnedCents: number;
  };
}

/** Everything the contributor's referral page and dashboard card need. */
export async function getMyReferralSummary(
  supabase: SupabaseClient,
  profile: Profile & { referral_code?: string | null }
): Promise<ReferralSummary> {
  const [settings, referralsRes, bonusRes] = await Promise.all([
    getReferralSettings(supabase),
    supabase.rpc("my_referrals"),
    supabase
      .from("ledger_entries")
      .select("amount_cents, idempotency_key")
      .eq("user_id", profile.id)
      .eq("kind", "bonus")
      .eq("ref_type", "referral"),
  ]);

  if (referralsRes.error) console.warn("my_referrals failed:", referralsRes.error.message);

  const referrals: MyReferralRow[] = ((referralsRes.data || []) as MyReferralRow[]).map((r) => ({
    ...r,
    earned_cents: Number(r.earned_cents || 0),
  }));

  // Only referrer-side rewards count as "earned from referrals", not the user's own welcome bonus.
  const earnedCents = (bonusRes.data || [])
    .filter((r) => String(r.idempotency_key || "").endsWith(":referrer"))
    .reduce((s, r) => s + Number(r.amount_cents), 0);

  const profilePercent = profileCompleteness(profile).percentage;
  const code = profile.referral_code || null;

  return {
    settings,
    code,
    link: code ? referralLink(code) : null,
    unlocked: profilePercent >= REFERRAL_MIN_PROFILE_PERCENT,
    profilePercent,
    referrals,
    stats: {
      invited: referrals.length,
      inProgress: referrals.filter((r) => r.status === "pending").length,
      qualified: referrals.filter((r) => r.status === "qualified").length,
      rewarded: referrals.filter((r) => r.status === "rewarded").length,
      earnedCents,
    },
  };
}
