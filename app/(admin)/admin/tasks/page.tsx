import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Task } from "@/lib/supabase/types";
import { TasksTable, type TaskWithCount } from "@/components/admin/tasks-table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const { supabase } = await requireAdmin();

  const { data: tasksData, error } = await supabase
    .from("tasks")
    .select("*, applications(count)")
    .order("created_at", { ascending: false });

  const tasks = (tasksData || []) as unknown as TaskWithCount[];

  const totalTasks = tasks.length;
  const openTasks = tasks.filter((t) => t.status === "open").length;
  const closedTasks = tasks.filter((t) => t.status === "closed").length;
  const draftTasks = tasks.filter((t) => t.status === "draft").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure task requirements, toggle availability states, and manage admission waitlists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/tasks/new">
            <Button size="sm" className="rounded-full text-xs font-semibold gap-1.5 shadow-xs px-4">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Tasks</span>
            <Layers className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-foreground">{totalTasks}</p>
        </div>
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#0F766E] mb-1">
            <span className="text-xs font-medium">Active / Open</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[#0F766E]">{openTasks}</p>
        </div>
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Closed</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-foreground">{closedTasks}</p>
        </div>
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#B45309] mb-1">
            <span className="text-xs font-medium">Drafts</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[#B45309]">{draftTasks}</p>
        </div>
      </div>

      {/* Tasks Table */}
      <TasksTable tasks={tasks} />
    </div>
  );
}
