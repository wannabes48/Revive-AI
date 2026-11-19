import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Task, WorkItem } from "@/lib/supabase/types";
import { WorkInterface } from "@/components/work/work-interface";

export const dynamic = "force-dynamic";

interface WorkItemPageProps {
  params: Promise<{
    slug: string;
    itemId: string;
  }>;
}

export default async function WorkItemPage({ params }: WorkItemPageProps) {
  const { slug, itemId } = await params;
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

  // Fetch work item
  const { data: item, error: itemError } = await supabase
    .from("work_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    notFound();
  }

  // Check that item is claimed by this contributor
  if (item.claimed_by !== user.id) {
    redirect(`/work/${slug}`);
  }

  // Get contributor's approved application rate
  const { data: application } = await supabase
    .from("applications")
    .select("rate_cents")
    .eq("task_id", task.id)
    .eq("user_id", user.id)
    .single();

  const effectiveRate = application?.rate_cents ?? task.rate_cents ?? 0;

  // Server-saved draft (migration 014); missing table just means no draft.
  const { data: draftRow } = await supabase
    .from("work_drafts")
    .select("answers, updated_at")
    .eq("work_item_id", item.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-6xl mx-auto">
      <WorkInterface
        task={task as Task}
        item={item as WorkItem}
        rateCents={effectiveRate}
        draft={draftRow ? { answers: (draftRow.answers || {}) as Record<string, unknown>, updatedAt: draftRow.updated_at } : null}
      />
    </div>
  );
}
