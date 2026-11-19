// Run with: npm test
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildPairwiseForm } from "../lib/rubrics/build-pairwise-form";
import { CLINICAL_TASK_FORM, clinicalConfig } from "../lib/rubrics/clinical";
import { PYTHON_CODE_REVIEW_TASK_FORM } from "../lib/rubrics/python-code-review";
import { configFromTask } from "../lib/rubrics";
import {
  blankConfig, configFromDraft, defaultDraft, draftFromConfig, parseRubricImport, syncComparisons, withScaleTable,
  type RubricDraft,
} from "../lib/task-wizard/rubric";
import { parseCsv, validateItemsCsv, itemsCsvTemplate, MAX_CELL_CHARS } from "../lib/task-wizard/csv";
import { buildFromInput, type WizardInput } from "../lib/task-wizard/input";
import { saveTaskCore, duplicateTaskCore, previewItemsCsvCore, type SaveContext, type TaskRow, type TaskStore } from "../lib/task-wizard/save-core";

// ---------------------------------------------------------------------------------------------
// helpers

const BASICS = {
  title: "Clinical AI Response Evaluation",
  slug: "clinical-ai-response-evaluation",
  summary: "Evaluate two AI responses to a clinical question.",
  description: "Rate and critique each response independently, then compare them and sign off.",
  category: "Healthcare",
  pay_model: "hourly" as const,
  rate: 25,
  budget: null,
  max_open_claims: 1,
  auto_approve_hourly: true,
  pay_min: 20,
  pay_max: 40,
  pay_unit: "hour" as const,
  commitment: "10-15 hrs/wk",
  location: "Remote",
  slots: 10,
};

function input(over: Partial<WizardInput> & { rubric?: unknown } = {}): WizardInput {
  return {
    intent: "draft",
    template: "pairwise",
    basics: BASICS,
    rubric: defaultDraft(),
    instructions: clinicalConfig.instructions,
    timing: { claim_minutes: 90, max_credited_minutes: 60 },
    items: { csvText: "", manual: [] },
    ...over,
  } as WizardInput;
}

/** In-memory store that records every call, so tests can prove nothing was written. */
function fakeStore(tasks: TaskRow[] = [], submissions: Record<string, number> = {}) {
  const calls: string[] = [];
  const audit: unknown[] = [];
  const batches: { taskId: string; name: string; count: number }[] = [];
  const store: TaskStore = {
    async getTask(id) { calls.push("getTask"); return tasks.find((t) => t.id === id) ?? null; },
    async countSubmissions(id) { calls.push("countSubmissions"); return submissions[id] ?? 0; },
    async slugTaken(slug, except) { calls.push("slugTaken"); return tasks.some((t) => t.slug === slug && t.id !== except); },
    async insertTask(row) {
      calls.push("insertTask");
      const id = `00000000-0000-4000-8000-${String(tasks.length + 1).padStart(12, "0")}`;
      tasks.push({ ...(row as object), id } as TaskRow);
      return id;
    },
    async updateTask(id, row) { calls.push("updateTask"); Object.assign(tasks.find((t) => t.id === id)!, row); },
    async deleteTask() { calls.push("deleteTask"); },
    async existingRefs() { calls.push("existingRefs"); return []; },
    async insertDraftBatch(taskId, name, items) { calls.push("insertDraftBatch"); batches.push({ taskId, name, count: items.length }); return { batchId: "b1", added: items.length }; },
    async writeAudit(e) { calls.push("writeAudit"); audit.push(e); },
  };
  const writes = () => calls.filter((c) => ["insertTask", "updateTask", "deleteTask", "insertDraftBatch", "writeAudit"].includes(c));
  return { store, calls, writes, tasks, audit, batches };
}

function ctx(store: TaskStore, opts: { userId?: string | null; admin?: boolean } = {}) {
  let storeOpened = false;
  const c: SaveContext = {
    currentUserId: async () => (opts.userId === undefined ? "admin-1" : opts.userId),
    isAdmin: async () => opts.admin ?? true,
    store: () => { storeOpened = true; return store; },
  };
  return { ctx: c, storeOpened: () => storeOpened };
}

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
const HEADER = ["case_id", "prompt", "response_a", "response_b"];

// ---------------------------------------------------------------------------------------------

describe("defaults", () => {
  test("a pairwise task created with the defaults has exactly the clinical item_schema", () => {
    const built = buildFromInput(input());
    assert.ok(built.ok, JSON.stringify(!built.ok && built));
    assert.equal(JSON.stringify(built.form.fields), JSON.stringify(CLINICAL_TASK_FORM.item_schema));
    assert.equal(JSON.stringify(built.form.parts), JSON.stringify(CLINICAL_TASK_FORM.item_parts));
  });

  test("the default draft has the 11 clinical dimensions and the 6 written prompts", () => {
    const d = defaultDraft();
    assert.equal(d.dimensions.length, 11);
    assert.equal(d.written.length, 6);
    assert.equal(d.errorCategories.options[0], "No material error / Accurate");
    assert.equal(d.errorCategories.options.at(-1), "Other");
    assert.equal(d.comparisons.filter((c) => c.enabled).length, 8);
    assert.deepEqual(d.text, { minLength: 20, maxLength: 3000 });
  });

  test("saving the defaults stores the clinical form as a draft task", async () => {
    const f = fakeStore();
    const res = await saveTaskCore(ctx(f.store).ctx, input());
    assert.ok(res.ok, JSON.stringify(res));
    assert.equal(res.status, "draft");
    assert.deepEqual(f.tasks[0].item_schema, CLINICAL_TASK_FORM.item_schema);
    assert.equal(f.tasks[0].claim_minutes, 90);
    assert.equal(f.tasks[0].max_credited_seconds_per_item, 3600);
    assert.equal(f.tasks[0].created_by, "admin-1");
    assert.equal((f.audit[0] as { action: string }).action, "create");
  });
});

describe("editing existing tasks", () => {
  for (const [name, form] of [["clinical", CLINICAL_TASK_FORM], ["python", PYTHON_CODE_REVIEW_TASK_FORM]] as const) {
    test(`${name}: task -> wizard draft -> form round-trips exactly`, () => {
      const config = configFromTask(form.item_schema, form.instructions, form)!;
      assert.ok(config);
      const back = buildPairwiseForm(configFromDraft(draftFromConfig(config), form.instructions, config.timing));
      assert.equal(JSON.stringify(back.item_schema), JSON.stringify(form.item_schema));
    });
  }

  test("reworded tasks keep their wording, and forms that are not pairwise are not treated as such", () => {
    const fields = CLINICAL_TASK_FORM.item_schema.map((f) => (f.id === "a_critique" ? { ...f, help: "Edited help" } : f));
    const config = configFromTask(fields, "")!;
    assert.equal(config.written.find((w) => w.id === "critique")?.help, "Edited help");
    assert.equal(configFromTask([{ id: "score", label: "Score", type: "rating", min: 1, max: 5 }], ""), undefined);
  });

  test("adding a dimension adds its comparison; removing it removes the comparison", () => {
    const d = defaultDraft();
    const dims = [...d.dimensions, { id: "tone", label: "Tone", help: "1 = rude, 5 = warm" }];
    let comps = syncComparisons(dims, d.comparisons);
    const tone = comps.find((c) => c.dimensionId === "tone")!;
    assert.equal(tone.enabled, true);
    assert.equal(tone.label, "Tone");
    comps = syncComparisons(d.dimensions, comps);
    assert.equal(comps.some((c) => c.dimensionId === "tone"), false);
  });

  test("the rating scale table in the instructions is replaced, not duplicated", () => {
    const md = withScaleTable(clinicalConfig.instructions, { labels: ["L1", "L2", "L3", "L4", "L5"], meanings: ["m1", "m2", "m3", "m4", "m5"] });
    assert.equal(md.split("## Common rating scale").length, 2);
    assert.match(md, /\| 5 \| L5 \| m5 \|/);
    assert.match(md, /## Instructions for evaluators/);
  });
});

describe("import rubric", () => {
  test("the blank config imports cleanly", () => {
    const res = parseRubricImport(JSON.stringify(blankConfig()));
    assert.ok(res.ok, JSON.stringify(!res.ok && res.errors));
  });

  test("a bad config shows field-level errors", () => {
    const bad = blankConfig() as unknown as Record<string, unknown>;
    bad.dimensions = [{ id: "Bad Id", label: "", help: "" }];
    (bad.scale as { labels: string[] }).labels = ["one"];
    const res = parseRubricImport(JSON.stringify(bad));
    assert.equal(res.ok, false);
    if (res.ok) return;
    const paths = res.errors.map((e) => e.path);
    assert.ok(paths.includes("scale.labels"), paths.join(", "));
    assert.ok(paths.includes("dimensions"), paths.join(", "));
    assert.ok(paths.includes("dimensions[0].id"), paths.join(", "));
    assert.ok(paths.includes("dimensions[0].label"), paths.join(", "));
  });

  test("broken JSON is reported, not thrown", () => {
    const res = parseRubricImport("{ not json");
    assert.equal(res.ok, false);
    if (!res.ok) assert.match(res.errors[0].message, /Not valid JSON/);
  });

  test("a bad rubric is refused by the server with field errors, and nothing is saved", async () => {
    const draft: RubricDraft = defaultDraft();
    draft.dimensions = draft.dimensions.slice(0, 2);
    draft.errorCategories.options = ["Wrong first", "Other"];
    const f = fakeStore();
    const res = await saveTaskCore(ctx(f.store).ctx, input({ rubric: draft }));
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.ok(res.fieldErrors?.["rubric.dimensions"], JSON.stringify(res.fieldErrors));
    assert.ok(res.fieldErrors?.["rubric.errorCategories.options.0"], JSON.stringify(res.fieldErrors));
    assert.deepEqual(f.writes(), []);
  });
});

describe("items CSV", () => {
  test("the template parses and validates", () => {
    const check = validateItemsCsv(itemsCsvTemplate());
    assert.ok(check.ok);
    assert.equal(check.total, 1);
  });

  test("quoted cells with commas, quotes and newlines, CRLF and a BOM", () => {
    const text = '﻿case_id,prompt,response_a,response_b\r\nC1,"Hello, ""world""","line 1\nline 2",b\r\n';
    const { rows } = parseCsv(text);
    assert.deepEqual(rows[1], ["C1", 'Hello, "world"', "line 1\nline 2", "b"]);
  });

  test("one bad row rejects the whole file, with its row number", () => {
    const text = csv([HEADER, ["C1", "p", "a", "b"], ["C2", "p", "", "b"], ["C3", "p", "a", "b"]]);
    const check = validateItemsCsv(text);
    assert.equal(check.ok, false);
    assert.deepEqual(check.rowErrors, [{ row: 3, column: "response_a", message: "response_a is empty" }]);
  });

  test("missing column, duplicate case_id and oversized cells are reported", () => {
    assert.match(validateItemsCsv(csv([["case_id", "prompt", "response_a"], ["C1", "p", "a"]])).fileErrors[0], /Missing column: response_b/);
    const dup = validateItemsCsv(csv([HEADER, ["C1", "p", "a", "b"], ["C1", "p", "a", "b"]]));
    assert.match(dup.rowErrors[0].message, /duplicate case_id "C1" \(first used in row 2\)/);
    assert.equal(dup.rowErrors[0].row, 3);
    const big = validateItemsCsv(csv([HEADER, ["C1", "x".repeat(MAX_CELL_CHARS + 1), "a", "b"]]));
    assert.equal(big.rowErrors[0].column, "prompt");
    assert.equal(big.rowErrors[0].row, 2);
  });

  test("the server refuses a file with one bad row and saves nothing (not even the task)", async () => {
    const f = fakeStore();
    const text = csv([HEADER, ["C1", "p", "a", "b"], ["C2", "p", "a", ""]]);
    const res = await saveTaskCore(ctx(f.store).ctx, input({ items: { csvText: text, manual: [] } }));
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.deepEqual(res.rowErrors, ["CSV Row 3: response_b is empty"]);
    assert.deepEqual(f.writes(), []);
  });

  test("valid items go into a new draft batch", async () => {
    const f = fakeStore();
    const text = csv([HEADER, ["C1", "p", "a", "b"], ["C2", "p", "a", "b"]]);
    const res = await saveTaskCore(ctx(f.store).ctx, input({ items: { csvText: text, manual: [{ case_id: "M1", prompt: "p", response_a: "a", response_b: "b" }] } }));
    assert.ok(res.ok, JSON.stringify(res));
    assert.equal(res.batch?.added, 3);
    assert.equal(f.batches[0].count, 3);
  });
});

describe("access", () => {
  test("a non-admin cannot create or update, and the privileged store is never opened", async () => {
    for (const taskId of [undefined, "00000000-0000-4000-8000-000000000001"]) {
      const f = fakeStore([{ id: "00000000-0000-4000-8000-000000000001", slug: "x", status: "open" }]);
      const c = ctx(f.store, { admin: false });
      const res = await saveTaskCore(c.ctx, input({ taskId }));
      assert.deepEqual(res, { ok: false, error: "Only admins can create or change tasks." });
      assert.equal(c.storeOpened(), false);
      assert.deepEqual(f.calls, []);
    }
  });

  test("signed-out callers are refused for save, CSV preview and duplicate", async () => {
    const f = fakeStore();
    const c = ctx(f.store, { userId: null });
    assert.equal((await saveTaskCore(c.ctx, input())).ok, false);
    assert.equal((await previewItemsCsvCore(c.ctx, itemsCsvTemplate())).ok, false);
    assert.equal((await duplicateTaskCore(c.ctx, "00000000-0000-4000-8000-000000000001")).ok, false);
    assert.equal(c.storeOpened(), false);
  });

  test("garbage input is refused by zod before anything is read", async () => {
    const f = fakeStore();
    const res = await saveTaskCore(ctx(f.store).ctx, { intent: "publish-everything", basics: 1 });
    assert.equal(res.ok, false);
    assert.deepEqual(f.calls, []);
  });
});

describe("tasks with submissions", () => {
  const ID = "00000000-0000-4000-8000-000000000009";
  const existing = (): TaskRow => ({
    id: ID, slug: BASICS.slug, status: "open", title: BASICS.title,
    item_schema: CLINICAL_TASK_FORM.item_schema, item_parts: CLINICAL_TASK_FORM.item_parts,
  });

  test("the schema cannot change: options, added fields and length limits are refused", async () => {
    const variants: ((d: RubricDraft) => void)[] = [
      (d) => { d.errorCategories.options.splice(1, 1); },
      (d) => { d.dimensions.push({ id: "tone", label: "Tone", help: "" }); d.comparisons = syncComparisons(d.dimensions, d.comparisons); },
      (d) => { d.text.minLength = 50; },
      (d) => { d.severity.enabled = false; },
    ];
    for (const change of variants) {
      const f = fakeStore([existing()], { [ID]: 3 });
      const draft = defaultDraft();
      change(draft);
      const res = await saveTaskCore(ctx(f.store).ctx, input({ taskId: ID, intent: "keep", rubric: draft }));
      assert.equal(res.ok, false);
      if (!res.ok) assert.match(res.error, /3 submissions/);
      assert.deepEqual(f.writes(), [], "nothing written");
      assert.deepEqual(f.tasks[0].item_schema, CLINICAL_TASK_FORM.item_schema);
    }
  });

  test("wording and timing can still change", async () => {
    const f = fakeStore([existing()], { [ID]: 3 });
    const draft = defaultDraft();
    draft.dimensions[0].help = "Clearer help text";
    draft.errorCategories.label = "Main error";
    const res = await saveTaskCore(ctx(f.store).ctx, input({ taskId: ID, intent: "keep", rubric: draft, timing: { claim_minutes: 120, max_credited_minutes: 45 } }));
    assert.ok(res.ok, JSON.stringify(res));
    assert.equal(res.status, "open");
    assert.equal(f.tasks[0].claim_minutes, 120);
    const a0 = (f.tasks[0].item_schema as { id: string; help?: string }[]).find((x) => x.id === "a_comprehension");
    assert.equal(a0?.help, "Clearer help text");
  });

  test("without submissions the structure can change", async () => {
    const f = fakeStore([existing()], {});
    const draft = defaultDraft();
    draft.severity.enabled = false;
    const res = await saveTaskCore(ctx(f.store).ctx, input({ taskId: ID, intent: "keep", rubric: draft }));
    assert.ok(res.ok, JSON.stringify(res));
  });

  test("duplicate as new version makes a draft copy with a fresh slug", async () => {
    const f = fakeStore([existing()], { [ID]: 3 });
    const res = await duplicateTaskCore(ctx(f.store).ctx, ID);
    assert.ok(res.ok);
    if (!res.ok) return;
    assert.equal(res.slug, `${BASICS.slug}-v2`);
    const copy = f.tasks.find((t) => t.id === res.taskId)!;
    assert.equal(copy.status, "draft");
    assert.deepEqual(copy.item_schema, CLINICAL_TASK_FORM.item_schema);
  });
});
