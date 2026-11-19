"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

import { TaskStatus } from "@/lib/supabase/types";
import { after } from "next/server";
import { notifyTaskOpened } from "@/lib/emails/automation";

/** Email admitted contributors once the response is sent (deduplicated per task). */
function scheduleTaskOpenedAlert(taskId: string) {
  after(async () => {
    try {
      const sent = await notifyTaskOpened(taskId);
      if (sent > 0) console.log(`[Email Automation] Task ${taskId} open alert sent to ${sent} contributors.`);
    } catch (err) {
      console.error("[Email Automation] Task open alert failed:", err);
    }
  });
}

export type TaskActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
  taskId?: string;
};

export async function setTaskStatus(id: string, status: TaskStatus): Promise<TaskActionResult> {
  const { supabase } = await requireAdmin();

  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (task?.slug) {
    revalidatePath(`/tasks/${task.slug}`);
  }
  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  revalidatePath("/");

  if (status === "open") scheduleTaskOpenedAlert(id);

  return { success: true, message: `Task status updated to ${status}.` };
}

export async function deleteTask(id: string): Promise<TaskActionResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  revalidatePath("/");

  return { success: true, message: "Task and its waitlist were successfully deleted." };
}
