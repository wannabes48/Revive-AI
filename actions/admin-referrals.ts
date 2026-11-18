"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getReferralSettings } from "@/lib/referrals-server";
import {
  referralSettingsFormSchema,
  type ReferralSettings,
  type ReferralSettingsForm,
} from "@/lib/referrals";
import { maskDetails } from "@/lib/utils";

export type AdminReferralResult = { success?: boolean; error?: string; message?: string };

const RPC_ERRORS: Record<string, string> = {
  forbidden: "Only admins can review referrals.",
  already_reviewed: "This referral has already been reviewed.",
  note_required: "Add a note explaining why the referral is rejected.",
};

function revalidateReferralViews() {
  revalidatePath("/admin/referrals");
  revalidatePath("/referrals");
  revalidatePath("/dashboard");
}

/** Approve (pays both bonuses via the ledger) or reject a referral. */
export async function adminReviewReferral(
  referralId: string,
  approve: boolean,
  note?: string
): Promise<AdminReferralResult> {
  const { supabase } = await requireAdmin();
  const trimmed = note?.trim() || "";
  if (!approve && !trimmed) return { error: RPC_ERRORS.note_required };

  const { error } = await supabase.rpc("review_referral", {
    p_id: referralId,
    p_approve: approve,
    p_note: trimmed || null,
  });

  if (error) {
    const key = Object.keys(RPC_ERRORS).find((k) => error.message.includes(k));
    return { error: key ? RPC_ERRORS[key] : error.message };
  }

  revalidateReferralViews();
  revalidatePath("/admin/finance");
  return {
    success: true,
    message: approve ? "Referral approved and bonuses added to both wallets." : "Referral rejected.",
  };
}

async function writeSettings(next: ReferralSettings): Promise<AdminReferralResult> {
  const { supabase, user } = await requireAdmin();
  const { error } = await supabase.from("app_settings").upsert({
    key: "referral",
    value: next,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidateReferralViews();
  return { success: true };
}

/** Save the program configuration (amounts arrive in dollars). */
export async function adminUpdateReferralSettings(
  form: ReferralSettingsForm
): Promise<AdminReferralResult> {
  const { supabase } = await requireAdmin();
  const parsed = referralSettingsFormSchema.safeParse(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid settings." };

  const f = parsed.data;
  const current = await getReferralSettings(supabase);
  const res = await writeSettings({
    ...current,
    referrer_reward_cents: Math.round(f.referrer_reward_dollars * 100),
    referred_reward_cents: Math.round(f.referred_reward_dollars * 100),
    min_earned_cents: Math.round(f.min_earned_dollars * 100),
    window_days: f.window_days,
    hold_days: f.hold_days,
    max_rewards_per_referrer: f.max_rewards_per_referrer,
    auto_approve: f.auto_approve,
  });
  return res.error ? res : { success: true, message: "Referral settings saved." };
}

/** The master switch. */
export async function adminSetReferralEnabled(enabled: boolean): Promise<AdminReferralResult> {
  const { supabase } = await requireAdmin();
  const current = await getReferralSettings(supabase);
  const res = await writeSettings({ ...current, enabled });
  return res.error
    ? res
    : {
        success: true,
        message: enabled ? "Referral program is live." : "Referral program paused.",
      };
}

export interface ReferralAccountDetails {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  payoutsBlocked: boolean;
  payoutMethods: { type: string; masked: string; createdAt: string }[];
  recentSubmissions: { status: string; createdAt: string; earningCents: number | null }[];
}

/** Side-panel data for flagged referrals: both accounts' payout methods, ages, recent work. */
export async function adminGetReferralDetails(
  referrerId: string,
  referredId: string
): Promise<{ referrer?: ReferralAccountDetails; referred?: ReferralAccountDetails; error?: string }> {
  const { supabase } = await requireAdmin();

  const load = async (userId: string): Promise<ReferralAccountDetails | undefined> => {
    const [profileRes, methodsRes, subsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, created_at, payouts_blocked")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("payout_methods")
        .select("type, details, created_at")
        .eq("user_id", userId),
      supabase
        .from("submissions")
        .select("status, created_at, earning_cents")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    const p = profileRes.data;
    if (!p) return undefined;
    return {
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      createdAt: p.created_at,
      payoutsBlocked: Boolean(p.payouts_blocked),
      payoutMethods: (methodsRes.data || []).map((m) => ({
        type: m.type,
        masked: maskDetails(m.type, m.details),
        createdAt: m.created_at,
      })),
      recentSubmissions: (subsRes.data || []).map((s) => ({
        status: s.status,
        createdAt: s.created_at,
        earningCents: s.earning_cents,
      })),
    };
  };

  const [referrer, referred] = await Promise.all([load(referrerId), load(referredId)]);
  if (!referrer || !referred) return { error: "Could not load one of the accounts." };
  return { referrer, referred };
}
