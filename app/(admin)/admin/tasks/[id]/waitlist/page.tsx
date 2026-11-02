import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Task } from "@/lib/supabase/types";
import { WaitlistTable, WaitlistApplicant } from "@/components/admin/waitlist-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Hourglass,
  ExternalLink,
  ShieldAlert,
  Percent,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface WaitlistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TaskWaitlistPage({ params }: WaitlistPageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  // 1. Fetch task
  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (taskError || !taskData) {
    notFound();
  }

  const task = taskData as Task;

  // 2. Fetch applications with profile relations
  const { data: appsData, error: appsError } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      user_id,
      status,
      note,
      position,
      admin_note,
      created_at,
      profiles (
        id,
        full_name,
        email,
        expertise,
        country,
        bio
      )
    `)
    .eq("task_id", id)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const applications = (appsData || []) as unknown as WaitlistApplicant[];

  // 3. Compute slot filling metrics
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const waitlistedCount = applications.filter((a) => a.status === "waitlisted").length;
  const totalSlots = task.slots || 0;
  const fillPercentage = totalSlots > 0 ? Math.min(100, Math.round((approvedCount / totalSlots) * 100)) : 0;
  const isFull = totalSlots > 0 && approvedCount >= totalSlots;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Header & Navigation */}
      <div className="space-y-3 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <Link href="/admin/tasks">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Tasks</span>
            </Button>
          </Link>

          <Link href={`/tasks/${task.slug}`} target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold gap-1.5"
            >
              <span>Public Detail</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {task.title}
              </h1>
              <StatusBadge status={task.status} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Category: <strong className="text-foreground">{task.category}</strong> • Base Quota:{" "}
              <strong className="text-foreground">{task.slots || "Unlimited"} contributor slots</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Quota & Intake Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approved vs Slots */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Slots Filled / Target</span>
            {isFull ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                Quota Met
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                Open Slots
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-black text-[#0F766E]">
              {approvedCount}
            </span>
            <span className="text-base text-muted-foreground font-semibold">
              / {totalSlots || "∞"} slots approved
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Pending Waitlist */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">In Waitlist Queue</span>
            <Hourglass className="h-4 w-4 text-[#B45309]" />
          </div>
          <div>
            <div className="text-3xl font-heading font-black text-[#B45309]">
              {waitlistedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active candidates awaiting review or reordering
            </p>
          </div>
        </div>

        {/* Total Submissions */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Applicants</span>
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-3xl font-heading font-black text-foreground">
              {applications.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All lifetime application submissions for this task
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Waitlist Table Component */}
      <WaitlistTable
        taskId={task.id}
        taskSlots={task.slots}
        applications={applications}
      />
    </div>
  );
}
