import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Task, WorkItem } from "@/lib/supabase/types";
import { WorkItemsManager } from "@/components/admin/work-items-manager";

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <WorkItemsManager task={task as Task} items={(items || []) as WorkItem[]} />
    </div>
  );
}
