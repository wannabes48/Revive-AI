import Link from "next/link";
import { formatUsd } from "@/lib/referrals";
import { ArrowRight, Gift, Lock, PauseCircle } from "lucide-react";

/** Serializable summary passed from the dashboard server page. */
export interface ReferralCardData {
  enabled: boolean;
  unlocked: boolean;
  referrerRewardCents: number;
  referredRewardCents: number;
  minEarnedCents: number;
  windowDays: number;
  invited: number;
  rewarded: number;
  earnedCents: number;
}

export function ReferralDashboardCard({ data }: { data: ReferralCardData }) {
  return (
    <div className="rounded-2xl border border-[#0F766E]/25 bg-card p-5 shadow-2xs space-y-3">
      <div className="flex items-center gap-2 text-[#0F766E]">
        <Gift className="h-4 w-4 shrink-0" />
        <h4 className="font-heading text-sm font-bold text-foreground">Invite experts</h4>
      </div>

      {!data.enabled ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <PauseCircle className="h-4 w-4 shrink-0" />
          The referral program is paused.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Earn {formatUsd(data.referrerRewardCents)} when someone you invite earns{" "}
            {formatUsd(data.minEarnedCents)} in approved work within {data.windowDays} days.
            {data.referredRewardCents > 0 && <> They get {formatUsd(data.referredRewardCents)} too.</>}
          </p>
          {!data.unlocked && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Complete your profile to unlock your referral link.
            </p>
          )}
        </>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {data.invited} invited · {data.rewarded} rewarded
        </span>
        <span>
          Earned: <strong className="text-[#0F766E]">{formatUsd(data.earnedCents)}</strong>
        </span>
      </div>

      <Link
        href="/referrals"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline"
      >
        {data.enabled && data.unlocked ? "Get your invite link" : "View referrals"}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
