// The server side of the admin task wizard. Auth and storage are passed in, so the same code runs
// in the server action (Supabase) and in tests (an in-memory store).
//
// Order matters: the caller's role is checked first, and the privileged store (service role) is
// only created after that check passes.
import { validateItemsCsv, checkItem, formatRowError, type ItemRow, type RowError } from "./csv";
import { buildFromInput, checkSchemaLock, describeChanges, wizardInputSchema } from "./input";
import { zodFieldErrors, type FieldErrors } from "./rubric";
import type { Field, Part } from "../item-schema";

export type TaskRow = Record<string, unknown> & { id: string; slug: string; status: string };

export interface TaskStore {
  getTask(id: string): Promise<TaskRow | null>;
  countSubmissions(taskId: string): Promise<number>;
  slugTaken(slug: string, exceptId?: string): Promise<boolean>;
  insertTask(row: Record<string, unknown>): Promise<string>;
  updateTask(id: string, row: Record<string, unknown>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  existingRefs(taskId: string, refs: string[]): Promise<string[]>;
  /** Creates a DRAFT batch with these items. Returns the batch id and how many were added. */
  insertDraftBatch(taskId: string, name: string, items: ItemRow[]): Promise<{ batchId: string; added: number }>;
  writeAudit(entry: { task_id: string; actor_id: string; action: string; changes: Record<string, unknown> }): Promise<void>;
}

export interface SaveContext {
  currentUserId(): Promise<string | null>;
  isAdmin(userId: string): Promise<boolean>;
  /** Privileged storage. Only called after the admin check. */
  store(): TaskStore;
}

export type SaveResult =
  | { ok: true; taskId: string; slug: string; status: string; batch: { id: string; name: string; added: number } | null; warnings: string[] }
  | { ok: false; error: string; fieldErrors?: FieldErrors; problems?: string[]; rowErrors?: string[] };

async function requireAdminCtx(ctx: SaveContext): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const userId = await ctx.currentUserId();
  if (!userId) return { ok: false, error: "Sign in to continue." };
  if (!(await ctx.isAdmin(userId))) return { ok: false, error: "Only admins can create or change tasks." };
  return { ok: true, userId };
}

/** Parses an items CSV for the preview. Admin only; nothing is saved. */
export async function previewItemsCsvCore(ctx: SaveContext, csvText: unknown) {
  const auth = await requireAdminCtx(ctx);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  if (typeof csvText !== "string") return { ok: false as const, error: "Upload a CSV file." };
  const check = validateItemsCsv(csvText);
  const clip = (s: string) => (s.length > 280 ? `${s.slice(0, 280)}…` : s);
  return {
    ok: true as const,
    valid: check.ok && check.fileErrors.length === 0,
    total: check.total,
    preview: check.rows.slice(0, 5).map((r) => ({
      case_id: clip(r.case_id), prompt: clip(r.prompt), response_a: clip(r.response_a), response_b: clip(r.response_b),
    })),
    fileErrors: check.fileErrors,
    rowErrors: check.rowErrors.slice(0, 200),
    moreErrors: Math.max(0, check.rowErrors.length - 200),
  };
}

/** Every item from the CSV and the hand-added cases, or the errors that reject them all. */
function collectItems(csvText: string, manual: ItemRow[]): { items: ItemRow[]; errors: string[] } {
  const items: ItemRow[] = [];
  const errors: string[] = [];
  if (csvText.trim()) {
    const check = validateItemsCsv(csvText);
    errors.push(...check.fileErrors.map((e) => `CSV: ${e}`));
    errors.push(...check.rowErrors.map((e) => `CSV ${formatRowError(e)}`));
    if (check.ok) items.push(...check.rows);
  }
  const rowErrors: RowError[] = [];
  manual.forEach((m, i) => {
    const item = { ...m, case_id: m.case_id.trim() };
    rowErrors.push(...checkItem(item, i + 1));
    items.push(item);
  });
  errors.push(...rowErrors.map((e) => `Manual case ${e.row}: ${e.message}`));
  const seen = new Set<string>();
  for (const it of items) {
    if (it.case_id && seen.has(it.case_id)) errors.push(`case_id "${it.case_id}" is used more than once.`);
    seen.add(it.case_id);
  }
  return { items: errors.length ? [] : items, errors };
}

export async function saveTaskCore(ctx: SaveContext, raw: unknown): Promise<SaveResult> {
  const auth = await requireAdminCtx(ctx);
  if (!auth.ok) return { ok: false, error: auth.error };

  const parsed = wizardInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const input = parsed.data;
  const built = buildFromInput(input);
  if (!built.ok) {
    return built.problems.length
      ? { ok: false, error: "The answer form has problems.", problems: built.problems }
      : { ok: false, error: "Some fields need attention.", fieldErrors: built.fieldErrors };
  }
  // A credit cap above the claim window is allowed (it just can't be reached); the wizard warns.
  const { basics, timing, fields, parts, instructions } = built.form;

  const { items, errors: itemErrors } = collectItems(input.items.csvText, input.items.manual);
  if (itemErrors.length) {
    return { ok: false, error: "No items were saved: fix these rows and upload again.", rowErrors: itemErrors.slice(0, 200) };
  }

  const store = ctx.store();
  const existing = input.taskId ? await store.getTask(input.taskId) : null;
  if (input.taskId && !existing) return { ok: false, error: "This task no longer exists." };

  if (existing) {
    const submissions = await store.countSubmissions(existing.id);
    if (submissions > 0) {
      const lock = checkSchemaLock(
        (existing.item_schema as Field[]) ?? [],
        (existing.item_parts as Part[]) ?? [],
        fields,
        parts
      );
      if (lock.length) {
        return {
          ok: false,
          error: `This task has ${submissions} submission${submissions === 1 ? "" : "s"}, so only wording and timing can change. Use "Duplicate as new version" for bigger changes.`,
          problems: lock,
        };
      }
    }
  }

  if (await store.slugTaken(basics.slug, existing?.id)) {
    return { ok: false, error: "Some fields need attention.", fieldErrors: { "basics.slug": "Another task already uses this slug" } };
  }

  if (existing && items.length) {
    const dupes = await store.existingRefs(existing.id, items.map((i) => i.case_id));
    if (dupes.length) {
      return {
        ok: false,
        error: "No items were saved: some case_ids already exist in this task.",
        rowErrors: dupes.slice(0, 50).map((d) => `case_id "${d}" already exists in this task`),
      };
    }
  }

  const status = input.intent === "keep" ? (existing?.status ?? "draft") : input.intent;
  const row: Record<string, unknown> = {
    title: basics.title,
    slug: basics.slug,
    summary: basics.summary,
    description: basics.description,
    category: basics.category,
    pay_model: basics.pay_model,
    rate_cents: Math.round(basics.rate * 100),
    budget_cents: basics.budget === null ? null : Math.round(basics.budget * 100),
    max_open_claims: basics.pay_model === "hourly" ? 1 : basics.max_open_claims,
    auto_approve_hourly: basics.auto_approve_hourly,
    pay_min: basics.pay_min,
    pay_max: basics.pay_max,
    pay_unit: basics.pay_unit,
    commitment: basics.commitment,
    location: basics.location,
    slots: basics.slots,
    status,
    instructions: instructions.trim() || null,
    item_schema: fields,
    item_parts: parts,
    claim_minutes: timing.claim_minutes,
    max_credited_seconds_per_item: timing.max_credited_minutes * 60,
  };

  let taskId: string;
  if (existing) {
    await store.updateTask(existing.id, { ...row, updated_at: new Date().toISOString() });
    taskId = existing.id;
  } else {
    taskId = await store.insertTask({ ...row, created_by: auth.userId });
  }

  let batch: { id: string; name: string; added: number } | null = null;
  const warnings: string[] = [];
  if (items.length) {
    const name = input.items.batchName?.trim() || `Wizard upload ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    try {
      const res = await store.insertDraftBatch(taskId, name, items);
      batch = { id: res.batchId, name, added: res.added };
    } catch (e) {
      if (!existing) {
        await store.deleteTask(taskId); // don't leave a new task half-created
        return { ok: false, error: `Nothing was saved: the items could not be added (${(e as Error).message}).` };
      }
      return { ok: false, error: `The task was saved but the items were not added: ${(e as Error).message}` };
    }
  }

  try {
    const changes = describeChanges(existing, row);
    if (batch) changes.items = { batch: batch.name, added: batch.added, status: "draft" };
    await store.writeAudit({ task_id: taskId, actor_id: auth.userId, action: existing ? "update" : "create", changes });
  } catch (e) {
    warnings.push(`The audit log entry was not written (${(e as Error).message}). Apply supabase/015_task_audit_log.sql.`);
  }

  return { ok: true, taskId, slug: basics.slug, status, batch, warnings };
}

/** Copies a task (form, wording, timing, pay) into a new DRAFT task without items or submissions. */
export async function duplicateTaskCore(ctx: SaveContext, taskId: unknown) {
  const auth = await requireAdminCtx(ctx);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  if (typeof taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(taskId)) return { ok: false as const, error: "Invalid task." };

  const store = ctx.store();
  const source = await store.getTask(taskId);
  if (!source) return { ok: false as const, error: "This task no longer exists." };

  const baseSlug = String(source.slug).replace(/-v\d+$/, "");
  const baseTitle = String(source.title ?? "Task").replace(/ \(v\d+\)$/, "");
  let n = 2;
  while (await store.slugTaken(`${baseSlug}-v${n}`)) n++;

  const copy: Record<string, unknown> = { ...source };
  for (const k of ["id", "created_at", "updated_at"]) delete copy[k];
  Object.assign(copy, {
    slug: `${baseSlug}-v${n}`,
    title: `${baseTitle} (v${n})`,
    status: "draft",
    created_by: auth.userId,
  });
  const newId = await store.insertTask(copy);
  const warnings: string[] = [];
  try {
    await store.writeAudit({ task_id: newId, actor_id: auth.userId, action: "duplicate", changes: { from_task: source.id, from_slug: source.slug } });
  } catch (e) {
    warnings.push(`The audit log entry was not written (${(e as Error).message}).`);
  }
  return { ok: true as const, taskId: newId, slug: copy.slug as string, warnings };
}
