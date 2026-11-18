import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyReferralSummary } from "@/lib/referrals-server";
import {
  REFERRAL_MIN_PROFILE_PERCENT,
  REFERRAL_STATUS_LABELS,
  formatUsd,
  referralReasonForContributor,
  type MyReferralRow,
} from "@/lib/referrals";
import { formatDate } from "@/lib/utils";
import { ReferralShareCard } from "@/components/referrals/referral-share-card";
import { Gift, Lock, PauseCircle, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<MyReferralRow["status"], string> = {
  pending: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  qualified: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  rewarded: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  rejected: "bg-muted text-muted-foreground border-border",
};

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const summary = await getMyReferralSummary(supabase, profile);
  const { settings, stats } = summary;
  const goal = settings.min_earned_cents;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/60">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Invite experts
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Know someone who&apos;d do great evaluation work? Invite them to Revive AI.
        </p>
      </div>

      {/* Reward summary — always read from live settings */}
      <div className="p-5 rounded-2xl border border-[#0F766E]/25 bg-[#0F766E]/5 flex items-start gap-3">
        <Gift className="h-5 w-5 text-[#0F766E] shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-relaxed">
          You earn <strong>{formatUsd(settings.referrer_reward_cents)}</strong> when someone you invite
          earns <strong>{formatUsd(goal)}</strong> in approved work within{" "}
          <strong>{settings.window_days} days</strong>.
          {settings.referred_reward_cents > 0 && (
            <> They get <strong>{formatUsd(settings.referred_reward_cents)}</strong> too.</>
          )}{" "}
          <span className="text-muted-foreground">
            Rewards are added to your wallet with a {settings.hold_days}-day hold.
          </span>
        </p>
      </div>

      {/* Link card: paused / locked / active */}
      <section className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-foreground">Your referral link</h2>
        {!settings.enabled ? (
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <PauseCircle className="h-5 w-5 shrink-0" />
            <p>The referral program is paused. Check back soon.</p>
          </div>
        ) : !summary.unlocked ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Lock className="h-5 w-5 shrink-0" />
              <p>
                Complete your profile to unlock your referral link (at least{" "}
                {REFERRAL_MIN_PROFILE_PERCENT}% needed).
              </p>
            </div>
            <div className="space-y-1.5 max-w-md">
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Profile completeness</span>
                <span>{summary.profilePercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-[#0F766E] rounded-full"
                  style={{ width: `${summary.profilePercent}%` }}
                />
              </div>
              <Link href="/profile" className="text-xs font-semibold text-[#0F766E] hover:underline">
                Complete my profile →
              </Link>
            </div>
          </div>
        ) : summary.link && summary.code ? (
          <ReferralShareCard link={summary.link} code={summary.code} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Your referral code isn&apos;t ready yet. Please check back shortly.
          </p>
        )}
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Invited", value: stats.invited },
          { label: "In progress", value: stats.inProgress },
          { label: "Under review", value: stats.qualified },
          { label: "Rewarded", value: stats.rewarded },
          { label: "Earned", value: formatUsd(stats.earnedCents) },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {s.label}
            </span>
            <span className="text-xl font-heading font-extrabold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Referral list */}
      <section className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
        <h2 className="text-sm font-bold text-foreground px-5 pt-5 pb-3">People you invited</h2>
        {summary.referrals.length === 0 ? (
          <div className="px-5 pb-6 flex items-center gap-2.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            No one has joined with your link yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {summary.referrals.map((r) => {
              const pct = goal > 0 ? Math.min(100, Math.round((r.earned_cents / goal) * 100)) : 0;
              return (
                <li key={r.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {r.display_name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Joined {formatDate(r.created_at)}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLES[r.status]}`}
                    >
                      {REFERRAL_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  {r.status === "rejected" ? (
                    <p className="text-[11px] text-muted-foreground">
                      {referralReasonForContributor(r.flag_reason)}
                    </p>
                  ) : r.status !== "rewarded" ? (
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-[#0F766E] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatUsd(Math.min(r.earned_cents, goal))} of {formatUsd(goal)} in approved work
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Read the{" "}
        <Link href="/referral-terms" className="font-semibold text-[#0F766E] hover:underline">
          Referral terms
        </Link>
        . Single level only: rewards are paid for people you invite, never for people they invite.
      </p>
    </div>
  );
}
