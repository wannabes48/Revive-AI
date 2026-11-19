import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { TaskWizardLoader } from "@/components/admin/task-wizard/task-wizard-loader";
import type { SourceTask } from "@/components/admin/task-wizard/task-wizard";
import { ArrowLeft, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, slug, item_schema, item_parts, instructions, claim_minutes, max_credited_seconds_per_item")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      <div className="space-y-2">
        <Link href="/admin/tasks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to tasks
        </Link>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Create a task</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Four short steps. Nothing is visible to contributors until you open it.</p>
          </div>
        </div>
      </div>
      <TaskWizardLoader sources={(data ?? []) as SourceTask[]} />
    </div>
  );
}
