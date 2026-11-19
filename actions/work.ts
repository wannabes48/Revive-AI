"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildAnswersSchema, type Field } from "@/lib/item-schema";
import { mapRpcError } from "@/lib/rpc-errors";
import { formFlags } from "@/lib/rubrics";

/**
 * Starts work on a task: for hourly tasks this starts (or resumes) the server
 * work clock, then claims a random item and opens it.
 */
export async function startWorking(taskId: string, slug: string, hourly: boolean) {
  const supabase = await createClient();

  if (hourly) {
    const { error } = await supabase.rpc("start_work_session", { p_task_id: taskId });
    if (error) return { error: mapRpcError(error.message) };
  }

  const { data: itemId, error } = await supabase.rpc("claim_next_item", { p_task_id: taskId });
  if (error) return { error: mapRpcError(error.message) };

  if (!itemId) {
    // Nothing to work on: stop the clock so no time is counted.
    if (hourly) await supabase.rpc("end_work_session");
    revalidatePath(`/work/${slug}`);
    return { empty: true };
  }

  redirect(`/work/${slug}/${itemId}`);
}

export async function submitWork(taskId: string, itemId: string, answers: unknown) {
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

  // The browser sends no time: the server stores its own count.
  const { data: submissionId, error } = await supabase.rpc("submit_work", {
    p_item_id: itemId,
    p_answers: parsed.data,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  // Soft consistency warnings, recomputed on the server so they can't be skipped.
  const flags = formFlags(task.item_schema as Field[], parsed.data as Record<string, unknown>);
  if (flags.length > 0 && submissionId) {
    const { error: flagError } = await createAdminClient()
      .from("submissions")
      .update({ flags })
      .eq("id", submissionId as string);
    if (flagError) console.warn("Could not store submission flags:", flagError.message);
  }

  revalidatePath(`/work/${task.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath("/earnings");
  return { success: true };
}

/** Saves the contributor's unsent answers on the server. Returns when it was saved. */
export async function saveDraft(itemId: string, answers: Record<string, unknown>) {
  const supabase = await createClient();
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { error: "Invalid draft." };
  }
  const { data, error } = await supabase.rpc("save_draft", { p_item_id: itemId, p_answers: answers });
  if (error) {
    if (error.message.includes("draft_too_large")) return { error: "Your draft is too large to save." };
    return { error: mapRpcError(error.message) };
  }
  return { savedAt: (data as string | null) ?? new Date().toISOString() };
}

export async function heartbeat(itemId: string, active: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("work_heartbeat", {
    p_item_id: itemId,
    p_active: active,
  });
  if (error) return { error: mapRpcError(error.message) };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    itemSeconds: Number(row?.item_seconds ?? 0),
    sessionSeconds: Number(row?.session_seconds ?? 0),
    stopReason: (row?.stop_reason ?? null) as string | null,
  };
}

export async function confirmPresence() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_presence");
  if (error) return { error: mapRpcError(error.message) };
  return { success: true };
}

/** Stops the clock and returns any held item to the pool. */
export async function stopWorking(slug: string) {
  const supabase = await createClient();
  await supabase.rpc("end_work_session");
  revalidatePath(`/work/${slug}`);
  redirect(`/work/${slug}`);
}

export async function releaseItem(itemId: string, slug: string) {
  const supabase = await createClient();
  await supabase.rpc("release_item", { p_item_id: itemId });
  redirect(`/work/${slug}`);
}
