import { z } from "zod";
import { PARTS as RUBRIC_PARTS } from "@/lib/rubrics/clinical-ai-evaluation";

type Base = {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  /** id of the Part (step) this field belongs to */
  part?: string;
  /** heading shown above a run of fields inside a part */
  group?: string;
};

export type Field =
  | (Base & { type: "rating"; min: number; max: number; scaleLabels?: string[] })
  | (Base & { type: "select"; options: string[]; display?: "radio" | "dropdown" })
  | (Base & { type: "multiselect"; options: string[] })
  | (Base & { type: "boolean" })
  | (Base & { type: "text"; minLength?: number; maxLength?: number });

/** One step of a long form. A task with no parts shows its fields as a single page. */
export type Part = {
  id: string;
  title: string;
  intro?: string;
  /** payload keys shown beside the form during this part */
  show?: string[];
  /** parts that must be complete before this one opens */
  requires?: string[];
};

/**
 * Server-side validation. Every field of every part is checked at submit, so
 * locked steps in the browser only guide people and never protect anything.
 */
export function buildAnswersSchema(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const f of fields || []) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "rating":
        s = z
          .number({ message: `${f.label} must be a number` })
          .int()
          .min(f.min, `Minimum rating is ${f.min}`)
          .max(f.max, `Maximum rating is ${f.max}`);
        break;

      case "select":
        s =
          f.options && f.options.length > 0
            ? z.string().refine((val) => f.options.includes(val), {
                message: `Please choose a valid option for ${f.label}`,
              })
            : z.string();
        break;

      case "multiselect":
        s = z.array(z.string()).refine((arr) => arr.every((v) => (f.options || []).includes(v)), {
          message: `Invalid selection in ${f.label}`,
        });
        if (f.required !== false) {
          s = (s as z.ZodArray<z.ZodString>).min(1, `Please select at least one option for ${f.label}`);
        }
        break;

      case "boolean":
        s = z.boolean({ message: `${f.label} must be yes or no` });
        break;

      case "text": {
        const minL = f.minLength ?? (f.required === false ? 0 : 1);
        const maxL = f.maxLength ?? 4000;
        let t = z.string().trim();
        if (minL > 0) {
          t = t.min(minL, minL === 1 ? `${f.label} is required` : `${f.label} must be at least ${minL} characters`);
        }
        s = t.max(maxL, `${f.label} cannot exceed ${maxL} characters`);
        break;
      }

      default:
        s = z.any();
    }

    shape[f.id] = f.required === false ? s.optional().nullable() : s;
  }

  return z.object(shape).strict(); // unknown keys are rejected
}

/** Run when an admin saves a task form (and in seed scripts). Returns a list of problems. */
export function checkForm(fields: Field[], parts: Part[] = []): string[] {
  const problems: string[] = [];
  if (!Array.isArray(fields)) return ["item_schema must be an array of fields."];
  const ids = new Set<string>();

  for (const f of fields) {
    if (!f || typeof f !== "object") {
      problems.push("Every field must be an object.");
      continue;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(f.id || "")) {
      problems.push(`Field id "${f.id}" must use lowercase letters, digits and underscores.`);
    }
    if (ids.has(f.id)) problems.push(`Duplicate field id "${f.id}".`);
    ids.add(f.id);
    if (!f.label) problems.push(`${f.id}: needs a label.`);
    if (f.type === "rating") {
      if (!(f.min < f.max)) problems.push(`${f.id}: min must be below max.`);
      if (f.scaleLabels && f.scaleLabels.length !== f.max - f.min + 1) {
        problems.push(`${f.id}: scaleLabels needs one label per score.`);
      }
    } else if (f.type === "select" || f.type === "multiselect") {
      if (!Array.isArray(f.options) || f.options.length === 0) problems.push(`${f.id}: needs at least one option.`);
      else if (new Set(f.options).size !== f.options.length) problems.push(`${f.id}: options must be unique.`);
    } else if (f.type === "text") {
      if (f.minLength !== undefined && f.maxLength !== undefined && f.minLength > f.maxLength) {
        problems.push(`${f.id}: minLength is above maxLength.`);
      }
    } else if (f.type !== "boolean") {
      const unknownField = f as { id?: string; type?: string };
      problems.push(`${unknownField.id}: unknown field type "${unknownField.type}".`);
    }
  }

  if (!parts || parts.length === 0) return problems;

  const seen = new Set<string>();
  for (const p of parts) {
    if (seen.has(p.id)) problems.push(`Duplicate part id "${p.id}".`);
    for (const r of p.requires ?? []) {
      if (!seen.has(r)) problems.push(`Part "${p.id}" requires "${r}", which must be listed before it.`);
    }
    seen.add(p.id);
    if (!fields.some((f) => f.part === p.id)) problems.push(`Part "${p.id}" has no fields.`);
  }
  for (const f of fields) {
    if (!f.part || !seen.has(f.part)) problems.push(`${f.id}: needs a part that exists in item_parts.`);
  }
  return problems;
}

export type PartState = { id: string; answered: number; total: number; complete: boolean; locked: boolean };

function isAnswered(v: unknown) {
  return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
}

/** Drives the stepper: progress per part, which parts are done, which are still locked. */
export function partProgress(
  fields: Field[],
  parts: Part[],
  answers: Record<string, unknown>
): PartState[] {
  const states: PartState[] = [];
  for (const p of parts) {
    const own = fields.filter((f) => f.part === p.id);
    const picked = Object.fromEntries(own.filter((f) => isAnswered(answers[f.id])).map((f) => [f.id, answers[f.id]]));
    const complete = buildAnswersSchema(own).safeParse(picked).success;
    const answered = own.filter((f) => isAnswered(answers[f.id])).length;
    const locked = (p.requires ?? []).some((r) => !states.find((s) => s.id === r)?.complete);
    states.push({ id: p.id, answered, total: own.length, complete, locked });
  }
  return states;
}

/** Splits a part's fields into consecutive runs that share a group heading. */
export function groupRuns(fields: Field[]): { group: string | null; fields: Field[] }[] {
  const runs: { group: string | null; fields: Field[] }[] = [];
  for (const f of fields) {
    const g = f.group ?? null;
    const last = runs[runs.length - 1];
    if (last && last.group === g) last.fields.push(f);
    else runs.push({ group: g, fields: [f] });
  }
  return runs;
}

/** Normalises a task's item_parts column into a list (empty for single-page forms). */
export function readParts(value: unknown): Part[] {
  return Array.isArray(value) ? (value as Part[]) : [];
}

/**
 * The steps to show for a form. Uses item_parts when the task defines them;
 * otherwise, if the fields name parts, rebuilds the steps from those names so a
 * multi-part form is never collapsed into one long page. Known part ids (the
 * evaluation rubric's part1, part2, part3, signoff) keep their titles, case
 * panes and unlock rules; any other id becomes "Step N", unlocked in order.
 */
export function resolveParts(fields: Field[], itemParts: unknown): Part[] {
  const explicit = readParts(itemParts);
  if (explicit.length > 0) return explicit;

  const ids: string[] = [];
  for (const f of Array.isArray(fields) ? fields : []) {
    if (f?.part && !ids.includes(f.part)) ids.push(f.part);
  }
  if (ids.length === 0) return [];

  const known = new Map(RUBRIC_PARTS.map((p) => [p.id, p]));
  return ids.map((id, i) => {
    const template = known.get(id);
    if (template) {
      // Keep only prerequisites that exist in this form
      const requires = (template.requires ?? []).filter((r) => ids.includes(r));
      return { ...template, requires: requires.length ? requires : undefined };
    }
    return { id, title: `Step ${i + 1}`, requires: i > 0 ? [ids[i - 1]] : undefined };
  });
}
