// Moves "AI Response Evaluation: Python Code Review" (slug code-review-python) onto its own
// pairwise config. Only the task's form is replaced (instructions, item_parts, item_schema and the
// timing from the config, which matches what the task already uses). Work items, batches, claims,
// submissions and pay are not touched. Items keep their payload keys: prompt, response_a, response_b.
//
//   npx tsx --env-file=.env.local scripts/seed-python-code-review-task.ts --dry-run
//   npx tsx --env-file=.env.local scripts/seed-python-code-review-task.ts
//
// Contributors holding an item when this runs keep their claim; draft answers saved under the old
// (clinical) field ids no longer match and are dropped from the form.
import { PYTHON_CODE_REVIEW_TASK_FORM as FORM } from "../lib/rubrics/python-code-review";
import { adminClient, assertValidForm, saveTaskForm } from "./lib/save-task-form";

const SLUG = "code-review-python";
const dryRun = process.argv.includes("--dry-run");

async function main() {
  assertValidForm(FORM);
  const supabase = adminClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, title, item_schema, item_parts")
    .eq("slug", SLUG)
    .single();
  if (error || !task) throw new Error(`Task "${SLUG}" not found.`);

  // Every key a step shows must exist on the task's items.
  const needed = [...new Set(FORM.item_parts.flatMap((p) => p.show ?? []))];
  const { data: items, error: itemsError } = await supabase.from("work_items").select("id, payload").eq("task_id", task.id);
  if (itemsError) throw itemsError;
  const missing = (items ?? []).filter((i) => needed.some((k) => !(k in ((i.payload ?? {}) as object))));
  if (missing.length) {
    throw new Error(`${missing.length} item(s) lack one of the payload keys ${needed.join(", ")}; nothing was saved.`);
  }

  const { count: claimed } = await supabase
    .from("work_items")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id)
    .eq("status", "claimed");

  console.log(`Task: ${task.title}`);
  console.log(`Current form: ${(task.item_schema as unknown[]).length} fields in ${(task.item_parts as unknown[]).length} parts.`);
  console.log(`New form:     ${FORM.item_schema.length} fields in ${FORM.item_parts.length} parts.`);
  console.log(`Items: ${items?.length ?? 0}, all with ${needed.join(", ")}. Currently claimed: ${claimed ?? 0}.`);

  if (dryRun) {
    console.log("Dry run: nothing was saved.");
    return;
  }
  await saveTaskForm(supabase, SLUG, FORM);
  console.log(`Saved. "${SLUG}" now uses the Python code review template.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
