// Checks row-level security on a real Supabase project: a signed-in contributor (and an anonymous
// visitor) cannot see a draft task, a draft batch, or its items, and cannot create tasks.
//
//   npm run test:db        (needs .env.local with the Supabase URL, anon key and service key)
//
// It creates a throwaway contributor account, a draft task, a draft batch and one item, and
// deletes all of them at the end, even if a check fails.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceKey && process.env.REVIVE_DB_TESTS === "1");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

test("contributors cannot see a draft task or a draft batch", { skip: !enabled && "set REVIVE_DB_TESTS=1 and the Supabase env vars" }, async () => {
  const admin = createClient(url!, serviceKey!, opts);
  const tag = randomUUID().slice(0, 8);
  const email = `rls-check-${tag}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  let userId: string | undefined;
  let taskId: string | undefined;

  after(async () => {
    if (taskId) await admin.from("tasks").delete().eq("id", taskId); // batch and items cascade
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(userError);
  userId = created.user!.id;

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .insert({
      title: `RLS check ${tag}`, slug: `zz-rls-check-${tag}`, summary: "Temporary task for an access test.",
      description: "Created and deleted by tests/db/draft-visibility.db.test.ts.", category: "Other",
      pay_min: 0, pay_max: 0, pay_unit: "task", commitment: "n/a", location: "Remote", slots: 1,
      status: "draft", pay_model: "per_item", rate_cents: 0, item_schema: [], item_parts: [], claim_minutes: 60,
    })
    .select("id")
    .single();
  assert.ifError(taskError);
  taskId = task!.id;

  const { data: batch, error: batchError } = await admin
    .from("item_batches").insert({ task_id: taskId, name: "RLS check", status: "draft" }).select("id").single();
  assert.ifError(batchError);
  const { error: itemError } = await admin.from("work_items").insert({
    task_id: taskId, batch_id: batch!.id, external_ref: `rls-${tag}`, status: "available",
    payload: { case_id: `rls-${tag}`, prompt: "p", response_a: "a", response_b: "b" },
  });
  assert.ifError(itemError);

  const contributor: SupabaseClient = createClient(url!, anonKey!, opts);
  const { error: signInError } = await contributor.auth.signInWithPassword({ email, password });
  assert.ifError(signInError);
  const anon = createClient(url!, anonKey!, opts);

  for (const [who, client] of [["contributor", contributor], ["anonymous", anon]] as const) {
    const tasks = await client.from("tasks").select("id").eq("id", taskId);
    assert.deepEqual(tasks.data ?? [], [], `${who} sees the draft task`);
    const bySlug = await client.from("tasks").select("id").eq("slug", `zz-rls-check-${tag}`);
    assert.deepEqual(bySlug.data ?? [], [], `${who} finds the draft task by slug`);
    const batches = await client.from("item_batches").select("id").eq("task_id", taskId);
    assert.deepEqual(batches.data ?? [], [], `${who} sees the draft batch`);
    const items = await client.from("work_items").select("id").eq("task_id", taskId);
    assert.deepEqual(items.data ?? [], [], `${who} sees the draft items`);
  }

  const claim = await contributor.rpc("claim_next_item", { p_task_id: taskId });
  assert.ok(claim.error, "claiming from a draft task must fail");
  assert.match(claim.error!.message, /task_not_open/);

  // Opening the task makes the task visible, but the batch is still a draft: still hidden.
  const { error: openError } = await admin.from("tasks").update({ status: "open" }).eq("id", taskId);
  assert.ifError(openError);
  const openTask = await contributor.from("tasks").select("id").eq("id", taskId);
  assert.equal(openTask.data?.length, 1, "sanity check: an open task is visible, so the checks above are meaningful");
  const stillHidden = await contributor.from("item_batches").select("id").eq("task_id", taskId);
  assert.deepEqual(stillHidden.data ?? [], [], "a draft batch of an open task must stay hidden");
  const stillNoItems = await contributor.from("work_items").select("id").eq("task_id", taskId);
  assert.deepEqual(stillNoItems.data ?? [], [], "items of a draft batch must stay hidden");

  // A contributor cannot create a task directly either (the server action also checks the role).
  const insert = await contributor.from("tasks").insert({
    title: "Not allowed", slug: `zz-rls-denied-${tag}`, summary: "x".repeat(12), description: "x".repeat(25),
    category: "Other", pay_min: 0, pay_max: 0, commitment: "n/a", status: "draft",
  });
  assert.ok(insert.error, "a contributor must not be able to insert a task");
  const leaked = await admin.from("tasks").select("id").eq("slug", `zz-rls-denied-${tag}`);
  if (leaked.data?.length) await admin.from("tasks").delete().eq("slug", `zz-rls-denied-${tag}`);
  assert.deepEqual(leaked.data ?? [], []);
});
