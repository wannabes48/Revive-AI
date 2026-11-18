import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { getContributorProjectsAndAnalytics } from "@/lib/projects-data";
import { DashboardViewController } from "@/components/dashboard/dashboard-view-controller";
import { getMyReferralSummary } from "@/lib/referrals-server";
import type { ReferralCardData } from "@/components/referrals/referral-dashboard-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const [dashboardData, contributorData] = await Promise.all([
    getDashboardData(user.id),
    getContributorProjectsAndAnalytics(user.id),
  ]);

  let referral: ReferralCardData | null = null;
  if (dashboardData.profile) {
    try {
      const summary = await getMyReferralSummary(supabase, dashboardData.profile);
      referral = {
        enabled: summary.settings.enabled,
        unlocked: summary.unlocked,
        referrerRewardCents: summary.settings.referrer_reward_cents,
        referredRewardCents: summary.settings.referred_reward_cents,
        minEarnedCents: summary.settings.min_earned_cents,
        windowDays: summary.settings.window_days,
        invited: summary.stats.invited,
        rewarded: summary.stats.rewarded,
        earnedCents: summary.stats.earnedCents,
      };
    } catch (err) {
      console.warn("Could not load referral summary for dashboard:", err);
    }
  }

  return (
    <DashboardViewController
      referral={referral}
      user={{ id: user.id, email: user.email }}
      profile={dashboardData.profile}
      dashboardData={dashboardData}
      contributorData={contributorData}
    />
  );
}
