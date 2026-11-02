import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Task, Application } from "@/lib/supabase/types";
import { formatPay, formatDate } from "@/lib/utils";
import { profileCompleteness } from "@/lib/profile";
import { MIN_PROFILE_TO_APPLY } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { ApplyPanel } from "@/components/apply-panel";
import {
  ChevronLeft,
  Clock,
  DollarSign,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface TaskDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch task by slug
  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("slug", slug)
    .single();

  if (taskError || !taskData) {
    notFound();
  }

  const task = taskData as Task;

  // Check auth user, existing application, and profile completeness
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let existingApplication: Application | null = null;
  let canApply = true;
  let completenessScore = 100;

  if (user) {
    const [{ data: appData }, { data: profileData }] = await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .eq("task_id", task.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    existingApplication = (appData as Application) || null;
    const completeness = profileCompleteness(profileData as any);
    completenessScore = completeness.score;
    canApply = completeness.score >= MIN_PROFILE_TO_APPLY;
  }

  const payFormatted = formatPay(task.pay_min, task.pay_max, task.pay_unit || "hour");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Back Link */}
      <div className="mb-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to all tasks</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content (8 columns on large screens) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header Card */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={task.status} />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {task.category}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Listed {formatDate(task.created_at)}</span>
              </div>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
              {task.title}
            </h1>

            {/* Quick Metrics Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                  Target Rate
                </span>
                <span className="font-heading text-sm sm:text-base font-bold text-primary">
                  {payFormatted}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                  Commitment
                </span>
                <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                  {task.commitment || "Flexible"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                  Location
                </span>
                <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                  {task.location || "Remote"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
                  Available Slots
                </span>
                <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                  {task.slots != null ? `${task.slots} Open` : "Open Pool"}
                </span>
              </div>
            </div>
          </div>

          {/* Task Summary */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 shadow-2xs space-y-3">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Project Brief
            </h2>
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
              {task.summary}
            </p>
          </div>

          {/* Full Task Description */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 shadow-2xs space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Detailed Scope & Deliverables
            </h2>
            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
              {task.description}
            </div>
          </div>

          {/* Contributor Protocol Checklist */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 shadow-2xs space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Verification Standards
            </h2>
            <div className="space-y-3 text-sm text-foreground/85">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Peer-reviewed scoring rubric provided before evaluation kick-off</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Blinded adversarial and calibration vignettes to establish accuracy</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Protected data-room protocol with strict non-disclosure compliance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Apply Column (4 columns on large screens) */}
        <aside className="lg:col-span-4 sticky top-24 space-y-6">
          <ApplyPanel
            task={task}
            user={user}
            existingApplication={existingApplication}
            canApply={canApply}
            completenessScore={completenessScore}
          />

          <div className="bg-card rounded-[14px] border border-border p-5 text-xs text-muted-foreground space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Admin Calibration Guarantee</span>
            </div>
            <p className="leading-relaxed">
              Every applicant dossier is examined by an assigned domain administrator. Waitlist status transparently updates as cohort capacity clears.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
