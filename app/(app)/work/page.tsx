import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatPay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContributorWorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all tasks for which user is approved
  const { data: approvedApps, error } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      rate_cents,
      work_paused,
      approved_at,
      tasks (
        id,
        slug,
        title,
        category,
        pay_model,
        rate_cents,
        pay_min,
        pay_max,
        pay_unit,
        instructions,
        status
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "approved");

  const apps = approvedApps || [];

  // Fetch contributor submissions stats grouped by task
  const { data: submissions } = await supabase
    .from("submissions")
    .select("task_id, status, earning_cents")
    .eq("user_id", user.id);

  // Fetch contributor time entries stats grouped by task
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("task_id, minutes, status, earning_cents")
    .eq("user_id", user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Work Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Active evaluation tasks, benchmark annotators, and work queues you are approved for.
          </p>
        </div>

        <Link href="/tasks">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-semibold gap-1.5 self-start sm:self-auto"
          >
            <span>Browse More Tasks</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {apps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {apps.map((app: any) => {
            const task = app.tasks;
            if (!task) return null;

            const isHourly = task.pay_model === "hourly";
            const effectiveRate = app.rate_cents ?? task.rate_cents;

            // Compute task stats
            const taskSubs = (submissions || []).filter((s) => s.task_id === task.id);
            const completedItems = taskSubs.filter((s) => s.status === "approved").length;
            const inReviewItems = taskSubs.filter((s) => s.status === "submitted").length;
            const subEarnings = taskSubs
              .filter((s) => s.status === "approved")
              .reduce((acc, curr) => acc + (curr.earning_cents || 0), 0);

            const taskTimes = (timeEntries || []).filter((t) => t.task_id === task.id);
            const approvedMinutes = taskTimes
              .filter((t) => t.status === "approved")
              .reduce((acc, curr) => acc + curr.minutes, 0);
            const inReviewMinutes = taskTimes
              .filter((t) => t.status === "submitted")
              .reduce((acc, curr) => acc + curr.minutes, 0);
            const timeEarnings = taskTimes
              .filter((t) => t.status === "approved")
              .reduce((acc, curr) => acc + (curr.earning_cents || 0), 0);

            const totalEarningsCents = subEarnings + timeEarnings;

            return (
              <div
                key={app.id}
                className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between gap-5 transition-all hover:border-primary/50"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {task.category || "Domain Task"}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {effectiveRate
                        ? isHourly
                          ? `${formatCents(effectiveRate)}/hr`
                          : `${formatCents(effectiveRate)} / item`
                        : formatPay(task.pay_min, task.pay_max, task.pay_unit)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-lg text-foreground hover:text-primary transition-colors">
                      <Link href={`/work/${task.slug}`}>{task.title}</Link>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isHourly ? "Hourly timesheet model" : "Per-approved-item compensation model"}
                    </p>
                  </div>

                  {app.work_paused && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Work is currently paused on this task by administrators.</span>
                    </div>
                  )}

                  {/* Metrics Bento */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        {isHourly ? "Logged" : "Done"}
                      </span>
                      <span className="font-heading font-bold text-sm text-foreground mt-0.5 block">
                        {isHourly
                          ? `${Math.round(approvedMinutes / 60)}h`
                          : completedItems}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        In Review
                      </span>
                      <span className="font-heading font-bold text-sm text-[#B45309] mt-0.5 block">
                        {isHourly
                          ? `${Math.round(inReviewMinutes / 60)}h`
                          : inReviewItems}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Earned
                      </span>
                      <span className="font-heading font-bold text-sm text-[#0F766E] mt-0.5 block">
                        {formatCents(totalEarningsCents)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                  <Link
                    href={`/work/${task.slug}/history`}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View history
                  </Link>

                  <Link href={`/work/${task.slug}`}>
                    <Button
                      size="sm"
                      disabled={app.work_paused}
                      className="rounded-full text-xs font-bold gap-1.5 h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                    >
                      <span>{isHourly ? "Log Time" : "Start Working"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-card rounded-[14px] border border-dashed border-border space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-heading font-bold text-base text-foreground">
              No Approved Tasks Yet
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Once an administrator reviews and approves your task application, it will appear here so you can immediately claim work items or log hours.
            </p>
          </div>
          <Link href="/tasks">
            <Button size="sm" className="rounded-full text-xs font-bold gap-1.5 h-8 px-5">
              <span>Explore Open Tasks</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
