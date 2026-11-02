import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { getContributorProjectsAndAnalytics } from "@/lib/projects-data";
import { DashboardViewController } from "@/components/dashboard/dashboard-view-controller";

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

  return (
    <DashboardViewController
      user={{ id: user.id, email: user.email }}
      profile={dashboardData.profile}
      dashboardData={dashboardData}
      contributorData={contributorData}
    />
  );
}
