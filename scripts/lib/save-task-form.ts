// Shared by the seed scripts: validates a form with checkForm and writes it to one task.
// A form with problems is never saved.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkForm } from "../../lib/item-schema";
import type { PairwiseForm } from "../../lib/rubrics/build-pairwise-form";

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (use --env-file=.env.local).");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function assertValidForm(form: PairwiseForm) {
  const problems = checkForm(form.item_schema, form.item_parts);
  if (problems.length) throw new Error(`The form is not valid; nothing was saved:\n${problems.join("\n")}`);
}

/** Validates, then updates the task with this slug. Returns the task id. */
export async function saveTaskForm(
  supabase: SupabaseClient,
  slug: string,
  form: PairwiseForm,
  extra: Record<string, unknown> = {}
): Promise<string> {
  assertValidForm(form);
  const { data: task, error: findError } = await supabase.from("tasks").select("id").eq("slug", slug).single();
  if (findError || !task) throw new Error(`Task "${slug}" not found.`);

  const { error } = await supabase
    .from("tasks")
    .update({ ...extra, ...form, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
  return task.id as string;
}
