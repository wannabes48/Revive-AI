import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { StatsCards } from "@/components/admin/stats-cards";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Hourglass,
  Plus,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();

  // Parallel stat queries
  const [
    openTasksRes,
    totalAppsRes,
    waitlistedAppsRes,
    approvedAppsRes,
    usersRes,
    latestAppsRes,
  ] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "waitlisted"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select(`
        id,
        task_id,
        user_id,
        status,
        note,
        position,
        created_at,
        tasks (
          id,
          title,
          slug,
          category
        ),
        profiles (
          id,
          full_name,
          email,
          expertise
        )
      `)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const openTasksCount = openTasksRes.count || 0;
  const totalApplicationsCount = totalAppsRes.count || 0;
  const waitlistedCount = waitlistedAppsRes.count || 0;
  const approvedCount = approvedAppsRes.count || 0;
  const usersCount = usersRes.count || 0;

  const latestApplications = (latestAppsRes.data || []) as any[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Platform Command & Control
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Overview of qualification pipelines, task allocations, and applicant waitlist standing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/tasks/new">
            <Button size="sm" className="rounded-full text-xs font-semibold gap-1.5 shadow-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <StatsCards
        openTasksCount={openTasksCount}
        totalApplicationsCount={totalApplicationsCount}
        waitlistedCount={waitlistedCount}
        approvedCount={approvedCount}
        usersCount={usersCount}
      />

      {/* Latest Applications Section */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">
              Recent Application Activity
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest submissions entering review queues.
            </p>
          </div>

          <Link href="/admin/tasks">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs font-semibold text-primary gap-1"
            >
              <span>Manage Tasks</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {latestApplications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Candidate</th>
                  <th className="py-3 px-4">Applied Task</th>
                  <th className="py-3 px-4 whitespace-nowrap">Applied Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Waitlist Pos</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-5 text-right whitespace-nowrap">Waitlist Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {latestApplications.map((app) => {
                  const profile = app.profiles;
                  const task = app.tasks;
                  const candidateName = profile?.full_name || profile?.email?.split("@")[0] || "Unknown User";

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-muted/20 transition-colors duration-150"
                    >
                      {/* Candidate */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-foreground leading-tight">
                          {candidateName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {profile?.email}
                          {profile?.expertise && ` • ${profile.expertise}`}
                        </div>
                      </td>

                      {/* Task */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {task ? (
                          <div>
                            <span className="font-medium text-foreground line-clamp-1">
                              {task.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {task.category}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Deleted Task</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(app.created_at)}
                      </td>

                      {/* Position */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        {app.status === "waitlisted" ? (
                          <span className="font-bold text-[#B45309]">
                            #{app.position || 1}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {task && (
                          <Link href={`/admin/tasks/${task.id}/waitlist`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs font-semibold h-7 gap-1"
                            >
                              <span>Manage Waitlist</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No applicant submissions yet.
          </div>
        )}
      </div>
    </div>
  );
}
