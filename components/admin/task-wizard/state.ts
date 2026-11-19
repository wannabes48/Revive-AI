// Client-side state of the admin task wizard and how it maps onto the server action's input.
import type { Task } from "@/lib/supabase/types";
import { checkForm, type Field, type Part } from "@/lib/item-schema";
import { buildPairwiseForm } from "@/lib/rubrics/build-pairwise-form";
import { clinicalConfig } from "@/lib/rubrics/clinical";
import { configFromTask } from "@/lib/rubrics";
import {
  configFromDraft, defaultDraft, draftFromConfig, rubricDraftSchema, zodFieldErrors, type FieldErrors, type RubricDraft,
} from "@/lib/task-wizard/rubric";
import { basicsSchema, timingSchema, type WizardInput } from "@/lib/task-wizard/input";
import type { ItemRow } from "@/lib/task-wizard/csv";

export type Template = "pairwise" | "single";

export type BasicsState = {
  title: string; slug: string; slugTouched: boolean; summary: string; description: string; category: string;
  pay_model: "per_item" | "hourly"; rate: number | null; budget: number | null; max_open_claims: number | null;
  auto_approve_hourly: boolean; pay_min: number | null; pay_max: number | null;
  pay_unit: "hour" | "task" | "milestone" | "project"; commitment: string; location: string; slots: number | null;
};

export type CsvPreview = {
  fileName: string;
  valid: boolean;
  total: number;
  preview: ItemRow[];
  fileErrors: string[];
  rowErrors: { row: number; column?: string; message: string }[];
  moreErrors: number;
};

export type WizardState = {
  basics: BasicsState;
  template: Template;
  rubric: RubricDraft;
  single: { schemaText: string; partsText: string };
  instructions: string;
  timing: { claim_minutes: number | null; max_credited_minutes: number | null };
  items: { csvText: string; csv: CsvPreview | null; manual: ItemRow[]; batchName: string };
};

export const STEPS = [
  { id: "basics", title: "Basics", short: "Basics" },
  { id: "rubric", title: "Rubric", short: "Rubric" },
  { id: "timing", title: "Timing", short: "Timing" },
  { id: "items", title: "Items", short: "Items" },
] as const;

export const STARTER_SINGLE: Field[] = [
  { id: "accuracy_rating", type: "rating", label: "Overall accuracy", help: "1 = completely wrong, 5 = flawless", min: 1, max: 5, required: true },
  { id: "verdict", type: "select", label: "Verdict", options: ["Acceptable", "Needs revision", "Unacceptable"], display: "radio", required: true },
  { id: "rationale", type: "text", label: "Rationale", help: "Explain your rating.", minLength: 20, maxLength: 3000, required: true },
];

const num = (v: unknown, fallback: number | null) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export function newState(): WizardState {
  return {
    basics: {
      title: "", slug: "", slugTouched: false, summary: "", description: "", category: "Healthcare",
      pay_model: "per_item", rate: 4.5, budget: null, max_open_claims: 1, auto_approve_hourly: true,
      pay_min: 65, pay_max: 95, pay_unit: "hour", commitment: "10-15 hrs/wk", location: "Remote", slots: 10,
    },
    template: "pairwise",
    rubric: defaultDraft(),
    single: { schemaText: JSON.stringify(STARTER_SINGLE, null, 2), partsText: "[]" },
    instructions: clinicalConfig.instructions,
    timing: { claim_minutes: 90, max_credited_minutes: 60 },
    items: { csvText: "", csv: null, manual: [], batchName: "" },
  };
}

/** The wizard state for an existing task: pairwise forms open in the rubric editor. */
export function stateFromTask(task: Task): WizardState {
  const base = newState();
  const config = configFromTask(task.item_schema, task.instructions, task);
  const fields = Array.isArray(task.item_schema) ? task.item_schema : [];
  return {
    basics: {
      title: task.title ?? "", slug: task.slug ?? "", slugTouched: true, summary: task.summary ?? "",
      description: task.description ?? "", category: task.category ?? "Other",
      pay_model: task.pay_model === "hourly" ? "hourly" : "per_item",
      rate: task.rate_cents != null ? task.rate_cents / 100 : 0,
      budget: task.budget_cents != null ? task.budget_cents / 100 : null,
      max_open_claims: num(task.max_open_claims, 1), auto_approve_hourly: task.auto_approve_hourly !== false,
      pay_min: num(task.pay_min, 0), pay_max: num(task.pay_max, 0),
      pay_unit: (["hour", "task", "milestone", "project"].includes(task.pay_unit ?? "") ? task.pay_unit : "hour") as BasicsState["pay_unit"],
      commitment: task.commitment ?? "", location: task.location ?? "Remote", slots: num(task.slots, 1),
    },
    template: config ? "pairwise" : "single",
    rubric: config ? draftFromConfig(config) : base.rubric,
    single: {
      schemaText: JSON.stringify(config || fields.length === 0 ? STARTER_SINGLE : fields, null, 2),
      partsText: JSON.stringify(config ? [] : (task.item_parts ?? []), null, 2),
    },
    instructions: task.instructions ?? "",
    timing: {
      claim_minutes: num(task.claim_minutes, 60),
      max_credited_minutes: Math.round((num(task.max_credited_seconds_per_item, 1800) as number) / 60),
    },
    items: { csvText: "", csv: null, manual: [], batchName: "" },
  };
}

function parseJsonArray(text: string): unknown[] | null {
  try {
    const v = JSON.parse(text || "[]");
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export function toInput(state: WizardState, intent: WizardInput["intent"], taskId?: string): WizardInput {
  const { slugTouched: _ignored, ...basics } = state.basics;
  void _ignored;
  return {
    taskId,
    intent,
    template: state.template,
    basics,
    rubric: state.template === "pairwise" ? state.rubric : undefined,
    single:
      state.template === "single"
        ? { item_schema: parseJsonArray(state.single.schemaText) ?? [], item_parts: parseJsonArray(state.single.partsText) ?? [] }
        : undefined,
    instructions: state.instructions,
    timing: state.timing,
    items: { csvText: state.items.csvText, manual: state.items.manual, batchName: state.items.batchName || undefined },
  };
}

/** Builds the form the server would build, for the live summary, Advanced view and preview. */
export function liveForm(state: WizardState): { fields: Field[]; parts: Part[]; problems: string[] } {
  if (state.template === "pairwise") {
    const ok = rubricDraftSchema.safeParse(state.rubric);
    if (!ok.success) return { fields: [], parts: [], problems: ["Fix the highlighted rubric fields."] };
    const form = buildPairwiseForm(
      configFromDraft(state.rubric, state.instructions, {
        claim_minutes: state.timing.claim_minutes ?? 90,
        max_credited_seconds_per_item: (state.timing.max_credited_minutes ?? 60) * 60,
      })
    );
    return { fields: form.item_schema, parts: form.item_parts, problems: checkForm(form.item_schema, form.item_parts) };
  }
  const fields = parseJsonArray(state.single.schemaText);
  const parts = parseJsonArray(state.single.partsText);
  if (!fields) return { fields: [], parts: [], problems: ["item_schema is not a JSON array."] };
  if (!parts) return { fields: fields as Field[], parts: [], problems: ["item_parts is not a JSON array."] };
  const problems = checkForm(fields as Field[], parts as Part[]);
  if ((fields as Field[]).length === 0) problems.unshift("Add at least one field.");
  return { fields: fields as Field[], parts: parts as Part[], problems };
}

/** Inline errors for one step (the same zod rules the server uses). */
export function validateStep(state: WizardState, step: number): FieldErrors {
  const { slugTouched: _ignored, ...basics } = state.basics;
  void _ignored;
  if (step === 0) {
    const r = basicsSchema.safeParse(basics);
    return r.success ? {} : zodFieldErrors(r.error, "basics");
  }
  if (step === 1) {
    if (state.template === "pairwise") {
      const r = rubricDraftSchema.safeParse(state.rubric);
      return r.success ? {} : zodFieldErrors(r.error, "rubric");
    }
    const { problems } = liveForm(state);
    return problems.length ? { "single.item_schema": problems.slice(0, 3).join(" ") } : {};
  }
  if (step === 2) {
    const r = timingSchema.safeParse(state.timing);
    return r.success ? {} : zodFieldErrors(r.error, "timing");
  }
  if (step === 3 && state.items.csv && !state.items.csv.valid) {
    return { "items.csv": "This file has errors. Fix them and upload it again, or remove it." };
  }
  return {};
}

export function stepOfError(path: string): number {
  if (path.startsWith("basics")) return 0;
  if (path.startsWith("rubric") || path.startsWith("single") || path.startsWith("instructions")) return 1;
  if (path.startsWith("timing")) return 2;
  return 3;
}
