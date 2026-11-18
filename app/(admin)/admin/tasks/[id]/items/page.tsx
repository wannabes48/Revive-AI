import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ItemBatch, Task, WorkItem } from "@/lib/supabase/types";
import { WorkItemsManager } from "@/components/admin/work-items-manager";
import { BatchesPanel } from "@/components/admin/batches-panel";

export const dynamic = "force-dynamic";

interface TaskItemsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TaskItemsPage({ params }: TaskItemsPageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  // Fetch task
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    notFound();
  }

  // Fetch work items
  const { data: items } = await supabase
    .from("work_items")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: false });

  const [{ data: batches, error: batchesError }, { count: approvedContributors }] = await Promise.all([
    supabase
      .from("item_batches")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id)
      .eq("status", "approved")
      .eq("work_paused", false),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <WorkItemsManager
        task={task as Task}
        items={(items || []) as WorkItem[]}
        batches={(batches || []) as ItemBatch[]}
      >
        {batchesError ? (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
            Apply <code className="font-mono">supabase/013_batches_and_work_clock.sql</code> to enable batch
            publishing.
          </div>
        ) : (
          <BatchesPanel
            task={task as Task}
            batches={(batches || []) as ItemBatch[]}
            items={(items || []) as WorkItem[]}
            approvedContributors={approvedContributors || 0}
          />
        )}
      </WorkItemsManager>
    </div>
  );
}
