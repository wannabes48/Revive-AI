"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ContributorDashboardData } from "@/lib/projects-data";
import { DashboardSubnav, DashboardTab } from "@/components/dashboard/dashboard-subnav";
import { OnboardingChecklistCard } from "@/components/dashboard/onboarding-checklist-card";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { ProjectsFeed } from "@/components/dashboard/projects-feed";
import { DashboardSidebarWidgets } from "@/components/dashboard/dashboard-sidebar-widgets";
import { PaymentsAnalyticsView } from "@/components/dashboard/payments-analytics-view";
import { DashboardHeader } from "@/components/app/dashboard-header";
import { RecommendedTaskCard } from "@/components/app/recommended-task-card";
import { ApplicationRow } from "@/components/app/application-row";
import { NotificationItem } from "@/components/app/notification-item";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import {
  ReferralDashboardCard,
  type ReferralCardData,
} from "@/components/referrals/referral-dashboard-card";
import {
  Sparkles,
  ArrowRight,
  Award,
  Bell,
  Briefcase,
  TrendingUp,
} from "lucide-react";

interface DashboardViewControllerProps {
  user: {
    id: string;
    email?: string;
  };
  profile: any;
  dashboardData: any;
  contributorData: ContributorDashboardData;
  referral?: ReferralCardData | null;
}

export function DashboardViewController({
  user,
  profile,
  dashboardData,
  contributorData,
  referral = null,
}: DashboardViewControllerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state synced with URL param ?tab=
  const urlTab = (searchParams.get("tab") as DashboardTab) || "ai-work";
  const [activeTab, setActiveTab] = React.useState<DashboardTab>(
    ["ai-work", "projects", "payments", "referrals"].includes(urlTab) ? urlTab : "ai-work"
  );

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const { counts, recommended, approved, recent, notifications } = dashboardData;
  const { onboarding, projects, analytics } = contributorData;

  return (
    <div className="space-y-8 pb-12">
      {/* Interactive Spotlight Tour for New Fellows */}
      <OnboardingTour hasCompletedTour={Boolean(profile?.has_completed_tour)} />

      {/* 1. Greeting Header */}
      <DashboardHeader fullName={profile?.full_name} email={user.email} />

      {/* 2. Sub-Navigation Bar */}
      <DashboardSubnav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userEmail={user.email}
        userAvatarUrl={profile?.avatar_url}
        userFullName={profile?.full_name}
        unreadCount={notifications?.length || 0}
      />

      {/* 3. TAB CONTENT */}
      {/* TAB 1: AI WORK (Onboarding Checklist Gate + Priority Production Tasks) */}
      {activeTab === "ai-work" && (
        <div className="space-y-8">
          {/* Onboarding Checklist & Verification Gate */}
          <OnboardingChecklistCard onboarding={onboarding} />

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left 2 Columns: Assigned Work & Tasks */}
            <div className="lg:col-span-2 space-y-8">
              {/* Approved Tasks */}
              {approved && approved.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        Your Active Tasks ({approved.length})
                      </h3>
                    </div>
                    <Link
                      href="/work"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Go to workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approved.map((app: any) => (
                      <div
                        key={app.id}
                        className="p-4 rounded-xl border border-[#0F766E]/30 bg-card shadow-2xs space-y-3"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                            {app.task?.category || "Evaluation"}
                          </span>
                          <h4 className="font-heading font-bold text-foreground text-sm line-clamp-1">
                            {app.task?.title}
                          </h4>
                        </div>
                        <Link href={`/work`}>
                          <Button
                            size="sm"
                            className="w-full rounded-full text-xs font-bold bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                          >
                            Resume Work
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Open Tasks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Featured Disciplinary Tasks
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Authoritative evaluation batches matched to your verified credentials.
                    </p>
                  </div>
                  <Link
                    href="/tasks"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Browse catalog</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {recommended && recommended.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {recommended.slice(0, 3).map((task: any) => (
                      <RecommendedTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No open tasks in queue"
                    description="Check back shortly as new frontier evaluation batches are calibrated."
                  />
                )}
              </div>

              {/* Recent Applications */}
              {recent && recent.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Recent Task Submissions
                    </h3>
                    <Link
                      href="/applications"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View all ({counts?.total || 0})</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="bg-card rounded-2xl border border-border shadow-2xs divide-y divide-border/60 overflow-hidden">
                    {recent.map((app: any) => (
                      <ApplicationRow key={app.id} app={app} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sidebar Widgets */}
            <div className="space-y-6">
              <DashboardSidebarWidgets
                analytics={analytics}
                referral={referral}
                onNavigateToPayments={() => handleTabChange("payments")}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS (Current vs Past Projects, Invitations, Open Opportunities) */}
      {activeTab === "projects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <ProjectsFeed
              currentProjects={projects.current}
              pastProjects={projects.past}
              invitations={projects.invitations}
              opportunities={projects.opportunities}
            />
          </div>
          <div className="space-y-6">
            <DashboardSidebarWidgets
              analytics={analytics}
              referral={referral}
              onNavigateToPayments={() => handleTabChange("payments")}
            />
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS (Comprehensive Analytics & Chart) */}
      {activeTab === "payments" && (
        <PaymentsAnalyticsView analytics={analytics} />
      )}

      {/* TAB 4: REFERRALS */}
      {activeTab === "referrals" && (
        <div className="max-w-xl">
          {referral ? (
            <ReferralDashboardCard data={referral} />
          ) : (
            <Link href="/referrals" className="text-sm font-semibold text-[#0F766E] hover:underline">
              Open the referral program
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
