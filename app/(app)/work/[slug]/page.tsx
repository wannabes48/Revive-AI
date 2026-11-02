import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatPay } from "@/lib/utils";
import { TimesheetView } from "@/components/work/timesheet-view";
import { StartItemButton } from "@/components/work/start-item-button";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Hourglass,
  Clock,
  ExternalLink,
  History,
  FileText,
  AlertCircle,
  Play,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface TaskWorkPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TaskWorkPage({ params }: TaskWorkPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch task
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("slug", slug)
    .single();

  if (taskError || !task) {
    notFound();
  }

  // Verify contributor approval
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("*")
    .eq("task_id", task.id)
    .eq("user_id", user.id)
    .single();

  if (appError || !application || application.status !== "approved") {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground">
          Not Approved for this Task
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You must have an approved application to access the work queue and compensation on this benchmark.
        </p>
        <div className="pt-2">
          <Link href="/work">
            <Button variant="outline" size="sm" className="rounded-full text-xs">
              Back to Work Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isHourly = task.pay_model === "hourly";
  const effectiveRate = application.rate_cents ?? task.rate_cents ?? 0;

  // Fetch contributor submissions stats for this task
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, status, earning_cents, created_at")
    .eq("task_id", task.id)
    .eq("user_id", user.id);

  const completedCount = (submissions || []).filter((s) => s.status === "approved").length;
  const inReviewCount = (submissions || []).filter((s) => s.status === "submitted").length;
  const itemEarnings = (submissions || [])
    .filter((s) => s.status === "approved")
    .reduce((acc, curr) => acc + (curr.earning_cents || 0), 0);

  // Fetch timesheets if hourly
  let timeEntries: any[] = [];
  if (isHourly) {
    const { data: times } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task.id)
      .eq("user_id", user.id)
      .order("work_date", { ascending: false });

    timeEntries = times || [];
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <Link href="/work">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Work Hub</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {task.category}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {isHourly ? "Hourly Timesheet" : "Per Item"}
          </span>
        </div>
      </div>

      {/* Main Task Header */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {task.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              {task.summary}
            </p>
          </div>

          <div className="text-right sm:self-center shrink-0 p-3 rounded-xl bg-muted/30 border border-border/60">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Compensation Rate
            </span>
            <span className="font-heading font-extrabold text-xl text-primary mt-0.5 block">
              {effectiveRate > 0
                ? isHourly
                  ? `${formatCents(effectiveRate)}/hr`
                  : `${formatCents(effectiveRate)} / approved item`
                : formatPay(task.pay_min, task.pay_max, task.pay_unit)}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        {!isHourly && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60 text-xs">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Approved Items
              </span>
              <span className="font-heading font-bold text-xl text-foreground mt-0.5 block">
                {completedCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                In Review Queue
              </span>
              <span className="font-heading font-bold text-xl text-[#B45309] mt-0.5 block">
                {inReviewCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Approved Earnings
              </span>
              <span className="font-heading font-bold text-xl text-[#0F766E] mt-0.5 block">
                {formatCents(itemEarnings)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Start Next Item CTA or Timesheet */}
      {!isHourly ? (
        <div className="bg-card rounded-[14px] border border-primary/30 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-lg text-foreground">
                Ready to Evaluate?
              </h3>
              <p className="text-xs text-muted-foreground">
                Claim the next available work item from the queue. You will have {task.claim_minutes || 60} minutes to complete and submit.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/work/${task.slug}/history`}>
                <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 h-9">
                  <History className="h-3.5 w-3.5" />
                  <span>Submission History</span>
                </Button>
              </Link>

              <StartItemButton taskId={task.id} slug={task.slug} disabled={application.work_paused} />
            </div>
          </div>

          {application.work_paused && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              Work on this task is currently paused for your account. Please check back later.
            </div>
          )}
        </div>
      ) : (
        <TimesheetView
          taskId={task.id}
          slug={task.slug}
          rateCents={effectiveRate}
          entries={timeEntries}
        />
      )}

      {/* Instructions Section */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Task Instructions & Guidelines
        </h3>

        <div className="p-4 rounded-xl bg-muted/20 border border-border/60 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
          {task.instructions || task.description || "Follow benchmark annotation guidelines carefully."}
        </div>
      </div>
    </div>
  );
}
