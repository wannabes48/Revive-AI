"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildAnswersSchema } from "@/lib/item-schema";
import { mapRpcError } from "@/lib/rpc-errors";

export async function startNextItem(taskId: string, slug: string) {
  const supabase = await createClient();
  const { data: itemId, error } = await supabase.rpc("claim_next_item", {
    p_task_id: taskId,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  if (!itemId) {
    return { empty: true };
  }

  redirect(`/work/${slug}/${itemId}`);
}

export async function submitWork(
  taskId: string,
  itemId: string,
  answers: unknown,
  seconds: number
) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("slug, item_schema")
    .eq("id", taskId)
    .single();

  if (!task) {
    return { error: "Task not found." };
  }

  const parsed = buildAnswersSchema(task.item_schema).safeParse(answers);
  if (!parsed.success) {
    return {
      error: "Please complete all required fields correctly.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.rpc("submit_work", {
    p_item_id: itemId,
    p_answers: parsed.data,
    p_seconds: Math.min(Math.max(Math.round(seconds), 0), 4 * 3600),
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath(`/work/${task.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/work");
  return { success: true };
}

export async function releaseItem(itemId: string, slug: string) {
  const supabase = await createClient();
  await supabase.rpc("release_item", { p_item_id: itemId });
  redirect(`/work/${slug}`);
}

export async function logTime(
  taskId: string,
  workDate: string,
  minutes: number,
  description: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in to log time." };
  }

  // Find user's approved application for this task
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .eq("status", "approved")
    .single();

  if (appError || !application) {
    return { error: "You are not an approved contributor on this task." };
  }

  const { error } = await supabase.from("time_entries").insert({
    user_id: user.id,
    application_id: application.id,
    task_id: taskId,
    work_date: workDate,
    minutes,
    description: description.trim(),
    status: "submitted",
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath(`/work`);
  revalidatePath(`/earnings`);
  return { success: true };
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in." };
  }

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id)
    .eq("status", "submitted");

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath(`/work`);
  revalidatePath(`/earnings`);
  return { success: true };
}
