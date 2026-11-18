import { requireAdmin } from "@/lib/auth";
import { getReferralSettings } from "@/lib/referrals-server";
import { formatUsd, type ReferralStatus } from "@/lib/referrals";
import {
  AdminReferralsView,
  type AdminReferralRow,
  type TopReferrer,
} from "@/components/admin/referrals-view";
import { Gift } from "lucide-react";

export const dynamic = "force-dynamic";

type PersonRef = { id: string; full_name: string | null; email: string } | null;

export default async function AdminReferralsPage() {
  const { supabase } = await requireAdmin();

  const [settings, referralsRes, bonusRes] = await Promise.all([
    getReferralSettings(supabase),
    supabase
      .from("referrals")
      .select(
        "id, referrer_id, referred_id, status, flag_reason, review_note, qualified_at, rewarded_at, referrer_reward_cents, referred_reward_cents, created_at, referrer:profiles!referrals_referrer_id_fkey(id, full_name, email), referred:profiles!referrals_referred_id_fkey(id, full_name, email)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("amount_cents")
      .eq("kind", "bonus")
      .eq("ref_type", "referral"),
  ]);

  const migrationMissing = Boolean(referralsRes.error);
  if (referralsRes.error) {
    console.warn("Could not load referrals (is migration 010 applied?):", referralsRes.error.message);
  }

  const raw = (referralsRes.data || []) as unknown as Array<{
    id: string;
    referrer_id: string;
    referred_id: string;
    status: ReferralStatus;
    flag_reason: string | null;
    review_note: string | null;
    created_at: string;
    referrer: PersonRef;
    referred: PersonRef;
  }>;

  // Approved earnings of every referred member (admins can read the whole ledger).
  const earnedByUser = new Map<string, number>();
  const referredIds = raw.map((r) => r.referred_id);
  for (let i = 0; i < referredIds.length; i += 200) {
    const { data } = await supabase
      .from("ledger_entries")
      .select("user_id, amount_cents")
      .eq("kind", "earning")
      .in("user_id", referredIds.slice(i, i + 200));
    for (const row of data || []) {
      earnedByUser.set(row.user_id, (earnedByUser.get(row.user_id) || 0) + Number(row.amount_cents));
    }
  }

  const label = (p: PersonRef) => (p ? p.full_name || p.email : "Deleted account");
  const rows: AdminReferralRow[] = raw.map((r) => ({
    id: r.id,
    referrerId: r.referrer_id,
    referredId: r.referred_id,
    referrerName: label(r.referrer),
    referrerEmail: r.referrer?.email || "",
    referredName: label(r.referred),
    referredEmail: r.referred?.email || "",
    status: r.status,
    flagReason: r.flag_reason,
    reviewNote: r.review_note,
    createdAt: r.created_at,
    earnedCents: earnedByUser.get(r.referred_id) || 0,
  }));

  // Stats
  const total = rows.length;
  const rewarded = rows.filter((r) => r.status === "rewarded").length;
  const qualifiedOrRewarded = rows.filter((r) => r.status === "qualified" || r.status === "rewarded").length;
  const paidCents = (bonusRes.data || []).reduce((s, r) => s + Number(r.amount_cents), 0);

  const byReferrer = new Map<string, TopReferrer>();
  for (const r of rows) {
    const entry = byReferrer.get(r.referrerId) || {
      id: r.referrerId,
      name: r.referrerName,
      email: r.referrerEmail,
      invited: 0,
      rewarded: 0,
    };
    entry.invited++;
    if (r.status === "rewarded") entry.rewarded++;
    byReferrer.set(r.referrerId, entry);
  }
  const topReferrers = [...byReferrer.values()]
    .sort((a, b) => b.rewarded - a.rewarded || b.invited - a.invited)
    .slice(0, 5);

  const stats = [
    { label: "Referrals created", value: String(total) },
    {
      label: "Qualification rate",
      value: total > 0 ? `${Math.round((qualifiedOrRewarded / total) * 100)}%` : "—",
    },
    { label: "Rewards paid", value: formatUsd(paidCents) },
    { label: "Cost per qualified referral", value: rewarded > 0 ? formatUsd(Math.round(paidCents / rewarded)) : "—" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="pb-4 border-b border-border/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Referral Program
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Review qualified referrals, watch for abuse, and configure rewards.
          </p>
        </div>
      </div>

      {migrationMissing && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          Referral tables aren&apos;t available. Apply <code className="font-mono">supabase/010_referrals.sql</code>{" "}
          to enable the program.
        </div>
      )}

      <AdminReferralsView
        rows={rows}
        stats={stats}
        topReferrers={topReferrers}
        settings={settings}
      />
    </div>
  );
}
