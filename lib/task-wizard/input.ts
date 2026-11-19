// What the admin wizard sends to the server, how it is validated, and how it becomes a form.
// Shared by the browser (inline errors) and the server action (the real check).
import { z } from "zod";
import { checkForm, type Field, type Part } from "../item-schema";
import { buildPairwiseForm } from "../rubrics/build-pairwise-form";
import { configFromDraft, rubricDraftSchema, zodFieldErrors, type FieldErrors, type RubricDraft } from "./rubric";
import { MAX_CSV_BYTES } from "./csv";

const text = (min: number, max: number, what: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${what} is required` : `${what} needs at least ${min} characters`)
    .max(max, `${what} can be at most ${max} characters`);
const num = (what: string) => z.number({ message: `${what} must be a number` }).finite(`${what} must be a number`);

export const basicsSchema = z
  .object({
    title: text(5, 160, "Title"),
    slug: z
      .string()
      .trim()
      .min(3, "Slug needs at least 3 characters")
      .max(80, "Slug can be at most 80 characters")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and single dashes"),
    summary: text(10, 300, "Summary"),
    description: text(20, 10000, "Description"),
    category: text(2, 80, "Category"),
    pay_model: z.enum(["per_item", "hourly"]),
    rate: num("Rate").min(0, "Rate cannot be negative").max(10000, "Rate looks too high"),
    budget: num("Budget").min(0, "Budget cannot be negative").nullable(),
    max_open_claims: num("Open claims").int("Whole number").min(1, "At least 1").max(10, "At most 10"),
    auto_approve_hourly: z.boolean(),
    pay_min: num("Display pay min").min(0, "Cannot be negative"),
    pay_max: num("Display pay max").min(0, "Cannot be negative"),
    pay_unit: z.enum(["hour", "task", "milestone", "project"]),
    commitment: text(2, 80, "Weekly commitment"),
    location: text(2, 80, "Location"),
    slots: num("Slots").int("Whole number").min(1, "At least 1").max(100000, "Too many"),
  })
  .refine((b) => b.pay_max >= b.pay_min, { path: ["pay_max"], message: "Must be at least the display pay min" });

export const timingSchema = z.object({
  claim_minutes: num("Claim window").int("Whole minutes").min(5, "At least 5 minutes").max(1440, "At most 24 hours"),
  max_credited_minutes: num("Credited time").int("Whole minutes").min(1, "At least 1 minute").max(240, "At most 4 hours"),
});

export const itemRowInput = z.object({
  case_id: z.string(),
  prompt: z.string(),
  response_a: z.string(),
  response_b: z.string(),
});

export const wizardInputSchema = z.object({
  taskId: z.string().uuid().optional(),
  intent: z.enum(["draft", "open", "keep"]),
  template: z.enum(["pairwise", "single"]),
  basics: z.unknown(),
  rubric: z.unknown().optional(),
  single: z.object({ item_schema: z.array(z.unknown()), item_parts: z.array(z.unknown()) }).optional(),
  instructions: z.string().max(50000, "Instructions can be at most 50,000 characters"),
  timing: z.unknown(),
  items: z.object({
    csvText: z.string().max(MAX_CSV_BYTES + 1024, "The CSV is larger than 4 MB").default(""),
    manual: z.array(itemRowInput).max(200, "Add at most 200 cases by hand; use a CSV for more").default([]),
    batchName: z.string().max(120).optional(),
  }),
});

export type WizardInput = z.infer<typeof wizardInputSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type Timing = z.infer<typeof timingSchema>;

export type BuiltForm = {
  basics: Basics;
  timing: Timing;
  fields: Field[];
  parts: Part[];
  instructions: string;
};

/** Validates every section and builds item_schema/item_parts. Errors are keyed by field path. */
export function buildFromInput(input: WizardInput): { ok: true; form: BuiltForm } | { ok: false; fieldErrors: FieldErrors; problems: string[] } {
  const fieldErrors: FieldErrors = {};
  const basics = basicsSchema.safeParse(input.basics);
  if (!basics.success) Object.assign(fieldErrors, zodFieldErrors(basics.error, "basics"));
  const timing = timingSchema.safeParse(input.timing);
  if (!timing.success) Object.assign(fieldErrors, zodFieldErrors(timing.error, "timing"));

  let fields: Field[] = [];
  let parts: Part[] = [];
  if (input.template === "pairwise") {
    const rubric = rubricDraftSchema.safeParse(input.rubric);
    if (!rubric.success) Object.assign(fieldErrors, zodFieldErrors(rubric.error, "rubric"));
    else if (timing.success) {
      const form = buildPairwiseForm(
        configFromDraft(rubric.data as RubricDraft, input.instructions, {
          claim_minutes: timing.data.claim_minutes,
          max_credited_seconds_per_item: timing.data.max_credited_minutes * 60,
        })
      );
      fields = form.item_schema;
      parts = form.item_parts;
    }
  } else {
    if (!input.single) fieldErrors["single.item_schema"] = "Add the fields for a single-page form";
    else {
      fields = input.single.item_schema as Field[];
      parts = input.single.item_parts as Part[];
      if (fields.length === 0) fieldErrors["single.item_schema"] = "A form needs at least one field";
    }
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, problems: [] };
  const problems = checkForm(fields, parts);
  if (problems.length) return { ok: false, fieldErrors: {}, problems };
  return {
    ok: true,
    form: { basics: basics.data!, timing: timing.data!, fields, parts, instructions: input.instructions },
  };
}

// ---------------------------------------------------------------------------------------------
// Tasks with submissions: wording and timing may change, the structure may not.

export function checkSchemaLock(oldFields: Field[], oldParts: Part[], newFields: Field[], newParts: Part[]): string[] {
  const problems: string[] = [];
  const ids = (fs: { id: string }[]) => fs.map((f) => f.id).join("|");
  if (ids(oldFields) !== ids(newFields)) {
    const before = new Set(oldFields.map((f) => f.id));
    const after = new Set(newFields.map((f) => f.id));
    const added = [...after].filter((x) => !before.has(x));
    const removed = [...before].filter((x) => !after.has(x));
    problems.push(
      added.length || removed.length
        ? `Fields cannot be added or removed${added.length ? ` (added: ${added.join(", ")})` : ""}${removed.length ? ` (removed: ${removed.join(", ")})` : ""}.`
        : "Fields cannot be reordered."
    );
    return problems;
  }
  oldFields.forEach((o, i) => {
    const n = newFields[i];
    if (o.type !== n.type) problems.push(`${o.id}: the type cannot change (${o.type} → ${n.type}).`);
    if ((o.part ?? "") !== (n.part ?? "")) problems.push(`${o.id}: cannot move to another step.`);
    if ((o.required !== false) !== (n.required !== false)) problems.push(`${o.id}: required/optional cannot change.`);
    if ((o.type === "select" || o.type === "multiselect") && (n.type === "select" || n.type === "multiselect")) {
      if (JSON.stringify(o.options) !== JSON.stringify(n.options)) problems.push(`${o.id}: the options cannot change.`);
    }
    if (o.type === "rating" && n.type === "rating" && (o.min !== n.min || o.max !== n.max)) {
      problems.push(`${o.id}: the scale cannot change.`);
    }
    if (o.type === "text" && n.type === "text" && (o.minLength !== n.minLength || o.maxLength !== n.maxLength)) {
      problems.push(`${o.id}: the length limits cannot change.`);
    }
  });
  if (ids(oldParts) !== ids(newParts)) problems.push("Steps cannot be added, removed or reordered.");
  else {
    oldParts.forEach((o, i) => {
      const n = newParts[i];
      if ((o.show ?? []).join("|") !== (n.show ?? []).join("|")) problems.push(`Step ${o.id}: the case pane cannot change.`);
      if ((o.requires ?? []).join("|") !== (n.requires ?? []).join("|")) problems.push(`Step ${o.id}: the unlock rule cannot change.`);
    });
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// Audit: a readable summary of what a save changed.

const TRACKED = [
  "title", "slug", "summary", "description", "category", "status", "pay_model", "rate_cents", "budget_cents",
  "max_open_claims", "auto_approve_hourly", "pay_min", "pay_max", "pay_unit", "commitment", "location", "slots",
  "instructions", "claim_minutes", "max_credited_seconds_per_item",
] as const;

export function describeChanges(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const changes: Record<string, unknown> = {};
  for (const key of TRACKED) {
    const a = before?.[key] ?? null;
    const b = after[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes[key] = key === "instructions" || key === "description" ? { changed: true } : { from: a, to: b };
    }
  }
  const oldFields = (Array.isArray(before?.item_schema) ? before!.item_schema : []) as Field[];
  const newFields = (Array.isArray(after.item_schema) ? after.item_schema : []) as Field[];
  const oldById = new Map(oldFields.map((f) => [f.id, f]));
  const added = newFields.filter((f) => !oldById.has(f.id)).map((f) => f.id);
  const removed = oldFields.filter((f) => !newFields.some((n) => n.id === f.id)).map((f) => f.id);
  const reworded = newFields
    .filter((f) => oldById.has(f.id) && JSON.stringify(oldById.get(f.id)) !== JSON.stringify(f))
    .map((f) => f.id);
  if (added.length || removed.length || reworded.length) {
    changes.item_schema = { fields: newFields.length, added, removed, changed: reworded };
  }
  if (JSON.stringify(before?.item_parts ?? []) !== JSON.stringify(after.item_parts ?? [])) {
    changes.item_parts = { steps: (after.item_parts as unknown[] | undefined)?.length ?? 0 };
  }
  return changes;
}
