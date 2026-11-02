"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { taskSchema } from "@/lib/validators";
import { TaskStatus } from "@/lib/supabase/types";

export type TaskActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
  taskId?: string;
};

export async function createTask(formData: FormData): Promise<TaskActionResult> {
  const { supabase, user } = await requireAdmin();

  let itemSchemaJson = [];
  const rawItemSchema = formData.get("item_schema");
  if (typeof rawItemSchema === "string" && rawItemSchema.trim()) {
    try {
      itemSchemaJson = JSON.parse(rawItemSchema);
    } catch (e) {
      // Keep empty if invalid JSON
    }
  }

  const rawRate = formData.get("rate");
  const rawRateCents = formData.get("rate_cents");
  let rateCents: number | null = null;
  if (rawRate && !isNaN(Number(rawRate))) {
    rateCents = Math.round(Number(rawRate) * 100);
  } else if (rawRateCents && !isNaN(Number(rawRateCents))) {
    rateCents = Number(rawRateCents);
  }

  const rawBudget = formData.get("budget");
  const rawBudgetCents = formData.get("budget_cents");
  let budgetCents: number | null = null;
  if (rawBudget && !isNaN(Number(rawBudget))) {
    budgetCents = Math.round(Number(rawBudget) * 100);
  } else if (rawBudgetCents && !isNaN(Number(rawBudgetCents))) {
    budgetCents = Number(rawBudgetCents);
  }

  const rawData = {
    title: (formData.get("title") as string)?.trim() || "",
    slug: (formData.get("slug") as string)?.trim() || "",
    summary: (formData.get("summary") as string)?.trim() || "",
    description: (formData.get("description") as string)?.trim() || "",
    category: (formData.get("category") as string)?.trim() || "",
    pay_min: formData.get("pay_min"),
    pay_max: formData.get("pay_max"),
    pay_unit: (formData.get("pay_unit") as string) || "hour",
    location: (formData.get("location") as string) || "Remote",
    commitment: (formData.get("commitment") as string) || "10-15 hrs/wk",
    slots: formData.get("slots") || 5,
    status: (formData.get("status") as TaskStatus) || "draft",
    pay_model: (formData.get("pay_model") as any) || "per_item",
    rate_cents: rateCents,
    instructions: (formData.get("instructions") as string)?.trim() || null,
    item_schema: itemSchemaJson,
    claim_minutes: Number(formData.get("claim_minutes")) || 60,
    max_open_claims: Number(formData.get("max_open_claims")) || 1,
    budget_cents: budgetCents,
  };

  const parsed = taskSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed." };
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A task with this slug already exists. Please customize the slug." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  revalidatePath("/");

  return { success: true, taskId: data.id };
}

export async function updateTask(id: string, formData: FormData): Promise<TaskActionResult> {
  const { supabase } = await requireAdmin();

  if (!id) return { error: "Missing task ID." };

  let itemSchemaJson = [];
  const rawItemSchema = formData.get("item_schema");
  if (typeof rawItemSchema === "string" && rawItemSchema.trim()) {
    try {
      itemSchemaJson = JSON.parse(rawItemSchema);
    } catch (e) {
      // Keep empty if invalid JSON
    }
  }

  const rawRate = formData.get("rate");
  const rawRateCents = formData.get("rate_cents");
  let rateCents: number | null = null;
  if (rawRate && !isNaN(Number(rawRate))) {
    rateCents = Math.round(Number(rawRate) * 100);
  } else if (rawRateCents && !isNaN(Number(rawRateCents))) {
    rateCents = Number(rawRateCents);
  }

  const rawBudget = formData.get("budget");
  const rawBudgetCents = formData.get("budget_cents");
  let budgetCents: number | null = null;
  if (rawBudget && !isNaN(Number(rawBudget))) {
    budgetCents = Math.round(Number(rawBudget) * 100);
  } else if (rawBudgetCents && !isNaN(Number(rawBudgetCents))) {
    budgetCents = Number(rawBudgetCents);
  }

  const rawData = {
    title: (formData.get("title") as string)?.trim() || "",
    slug: (formData.get("slug") as string)?.trim() || "",
    summary: (formData.get("summary") as string)?.trim() || "",
    description: (formData.get("description") as string)?.trim() || "",
    category: (formData.get("category") as string)?.trim() || "",
    pay_min: formData.get("pay_min"),
    pay_max: formData.get("pay_max"),
    pay_unit: (formData.get("pay_unit") as string) || "hour",
    location: (formData.get("location") as string) || "Remote",
    commitment: (formData.get("commitment") as string) || "10-15 hrs/wk",
    slots: formData.get("slots") || 5,
    status: (formData.get("status") as TaskStatus) || "draft",
    pay_model: (formData.get("pay_model") as any) || "per_item",
    rate_cents: rateCents,
    instructions: (formData.get("instructions") as string)?.trim() || null,
    item_schema: itemSchemaJson,
    claim_minutes: Number(formData.get("claim_minutes")) || 60,
    max_open_claims: Number(formData.get("max_open_claims")) || 1,
    budget_cents: budgetCents,
  };

  const parsed = taskSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A task with this slug already exists. Please choose a different slug." };
    }
    return { error: error.message };
  }

  revalidatePath(`/admin/tasks/${id}/edit`);
  revalidatePath("/admin/tasks");
  revalidatePath(`/tasks/${parsed.data.slug}`);
  revalidatePath("/tasks");
  revalidatePath("/");

  return { success: true, message: "Task successfully updated." };
}

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
