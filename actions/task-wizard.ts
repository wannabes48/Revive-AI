"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { notifyTaskOpened } from "@/lib/emails/automation";
import {
  duplicateTaskCore,
  previewItemsCsvCore,
  saveTaskCore,
  type SaveContext,
  type TaskRow,
  type TaskStore,
} from "@/lib/task-wizard/save-core";
import type { ItemRow } from "@/lib/task-wizard/csv";

/**
 * Auth comes from the caller's own session; the role is read from their profile on the server.
 * The service-role client is created only inside store(), which the core calls after that check.
 */
async function context(): Promise<SaveContext> {
  const supabase = await createClient();
  return {
    async currentUserId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async isAdmin(userId) {
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
      return data?.role === "admin";
    },
    store: () => supabaseStore(),
  };
}

function supabaseStore(): TaskStore {
  const db = createAdminClient();
  return {
    async getTask(id) {
      const { data } = await db.from("tasks").select("*").eq("id", id).maybeSingle();
      return (data as TaskRow | null) ?? null;
    },
    async countSubmissions(taskId) {
      const { count, error } = await db.from("submissions").select("id", { count: "exact", head: true }).eq("task_id", taskId);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    async slugTaken(slug, exceptId) {
      let q = db.from("tasks").select("id").eq("slug", slug);
      if (exceptId) q = q.neq("id", exceptId);
      const { data } = await q.limit(1);
      return (data ?? []).length > 0;
    },
    async insertTask(row) {
      const { data, error } = await db.from("tasks").insert(row).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Could not create the task.");
      return data.id as string;
    },
    async updateTask(id, row) {
      const { error } = await db.from("tasks").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async deleteTask(id) {
      await db.from("tasks").delete().eq("id", id);
    },
    async existingRefs(taskId, refs) {
      const found: string[] = [];
      for (let i = 0; i < refs.length; i += 300) {
        const { data } = await db
          .from("work_items")
          .select("external_ref")
          .eq("task_id", taskId)
          .in("external_ref", refs.slice(i, i + 300));
        found.push(...(data ?? []).map((r) => r.external_ref as string));
      }
      return found;
    },
    async insertDraftBatch(taskId, name, items: ItemRow[]) {
      const { data: batch, error } = await db
        .from("item_batches")
        .insert({ task_id: taskId, name, status: "draft" })
        .select("id")
        .single();
      if (error || !batch) throw new Error(error?.message ?? "Could not create the batch.");
      let added = 0;
      for (let i = 0; i < items.length; i += 500) {
        const chunk = items.slice(i, i + 500).map((it) => ({
          task_id: taskId,
          batch_id: batch.id,
          external_ref: it.case_id,
          payload: { case_id: it.case_id, prompt: it.prompt, response_a: it.response_a, response_b: it.response_b },
          status: "available",
        }));
        const { error: itemError } = await db.from("work_items").insert(chunk);
        if (itemError) {
          await db.from("item_batches").delete().eq("id", batch.id); // items cascade with it
          throw new Error(itemError.message);
        }
        added += chunk.length;
      }
      return { batchId: batch.id as string, added };
    },
    async writeAudit(entry) {
      const { error } = await db.from("task_audit_log").insert(entry);
      if (error) throw new Error(error.message);
    },
  };
}

function refresh(taskId: string, slug: string) {
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${taskId}/edit`);
  revalidatePath(`/admin/tasks/${taskId}/items`);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${slug}`);
  revalidatePath("/");
}

export async function saveTaskWizard(input: unknown) {
  const ctx = await context();
  try {
    const res = await saveTaskCore(ctx, input);
    if (res.ok) {
      refresh(res.taskId, res.slug);
      if (res.status === "open") {
        after(async () => {
          try {
            await notifyTaskOpened(res.taskId);
          } catch (err) {
            console.error("[Email Automation] Task open alert failed:", err);
          }
        });
      }
    }
    return res;
  } catch (e) {
    console.error("saveTaskWizard failed:", e);
    return { ok: false as const, error: `Could not save: ${(e as Error).message}` };
  }
}

/** Parses an uploaded items CSV on the server and returns a preview. Saves nothing. */
export async function previewItemsCsv(csvText: string) {
  return previewItemsCsvCore(await context(), csvText);
}

export async function duplicateTaskVersion(taskId: string) {
  const ctx = await context();
  try {
    const res = await duplicateTaskCore(ctx, taskId);
    if (res.ok) refresh(res.taskId, res.slug);
    return res;
  } catch (e) {
    return { ok: false as const, error: `Could not duplicate: ${(e as Error).message}` };
  }
}
