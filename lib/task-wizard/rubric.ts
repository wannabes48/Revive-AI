// The rubric as the admin wizard edits it: plain rows and option lists instead of item_schema.
// configFromDraft() turns it into a PairwiseConfig for buildPairwiseForm(); draftFromConfig() goes back.
import { z } from "zod";
import { DEFAULT_GROUPS, DEFAULT_TEXT, type PairwiseConfig, type Question } from "../rubrics/build-pairwise-form";
import { clinicalConfig } from "../rubrics/clinical";

export type Row = { id: string; label: string; help: string };

export type ComparisonRow = Row & {
  /** id of the rating dimension this compares, or "" if it matches none */
  dimensionId: string;
  enabled: boolean;
  /** wording generated from the dimension (follows renames) rather than written by hand */
  auto: boolean;
};

export type RubricDraft = {
  key: string;
  name: string;
  scale: { labels: string[]; meanings: string[] };
  groups: { ratings: string; classification: string; written: string };
  dimensions: Row[];
  comparisons: ComparisonRow[];
  errorCategories: Row & { options: string[] };
  severity: { enabled: boolean; question: Row & { options: string[] }; harm: Row };
  extent: Row & { options: string[] };
  safetyDimensionId: string;
  written: Row[];
  text: { minLength: number; maxLength: number };
  preferred: Row & { options: string[] };
  tieOptions: string[];
  confidence: Row & { scaleLabels: string[] };
  safetyOverride: Row & { options: string[] };
  comparisonWritten: Row[];
  signoff: { label: string; options: string[] };
};

export const NO_ERROR_OPTION = "No material error / Accurate";
export const OTHER_OPTION = "Other";
export const MIN_DIMENSIONS = 3;
const TIE_HELP = "Choose a tie if there is no meaningful difference on this dimension.";

/** Ids that the comparison fields may not use (they would collide with the fixed part 3 fields). */
const RESERVED_COMPARISON_IDS = ["preferred", "confidence", "safety_override", "rationale", "tradeoffs", "change", "verdict"];

// ---------------------------------------------------------------------------------------------
// ids

export function slugId(text: string, fallback = "item"): string {
  const s = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  return /^[a-z]/.test(s) ? s : s ? `${fallback}_${s}` : fallback;
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}_${i}`)) return `${base}_${i}`;
}

export function autoComparison(dim: Row, takenIds: Iterable<string>): ComparisonRow {
  return {
    dimensionId: dim.id,
    id: uniqueId(dim.id, [...takenIds, ...RESERVED_COMPARISON_IDS]),
    label: dim.label,
    help: `Which response is better on ${dim.label || "this dimension"}? ${TIE_HELP}`,
    enabled: true,
    auto: true,
  };
}

/** Keeps the comparison list in step with the dimensions: new ones get a row, removed ones lose it. */
export function syncComparisons(dimensions: Row[], comparisons: ComparisonRow[]): ComparisonRow[] {
  const dimIds = new Set(dimensions.map((d) => d.id));
  const kept = comparisons
    .filter((c) => c.dimensionId === "" || dimIds.has(c.dimensionId))
    .map((c) => {
      const dim = dimensions.find((d) => d.id === c.dimensionId);
      return c.auto && dim ? { ...c, label: dim.label, help: autoComparison(dim, []).help } : c;
    });
  for (const dim of dimensions) {
    if (!kept.some((c) => c.dimensionId === dim.id)) kept.push(autoComparison(dim, kept.map((c) => c.id)));
  }
  return kept;
}

// ---------------------------------------------------------------------------------------------
// config <-> draft

const row = (x: Question): Row => ({ id: x.id, label: x.label, help: x.help });

/** Matches a comparison to the dimension it compares: same id, else a shared word in the label. */
function matchDimension(comp: Question, dims: Question[]): string {
  const exact = dims.find((d) => d.id === comp.id);
  if (exact) return exact.id;
  const words = comp.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  const byWord = dims.find((d) => words.some((w) => d.label.toLowerCase().includes(w)));
  return byWord?.id ?? "";
}

export class DraftShapeError extends Error {}

export function draftFromConfig(config: PairwiseConfig): RubricDraft {
  const rules = config.consistency ?? {};
  const selects = config.classification.filter((c) => c.options);
  const yesNo = config.classification.filter((c) => !c.options);
  const find = (id?: string) => config.classification.find((c) => c.id === id);

  const error = find(rules.errorType) ?? selects[0];
  const extent = find(rules.errorExtent) ?? (selects.length >= 2 ? selects[selects.length - 1] : undefined);
  const severity = find(rules.harmSeverity) ?? (selects.length >= 3 ? selects[1] : undefined);
  const harm = find(rules.harm) ?? yesNo[0];
  if (!error?.options || !extent?.options) {
    throw new DraftShapeError(
      "classification needs an error-category question and an error-extent question (both with options)."
    );
  }
  const known = [error, extent, severity, harm].filter(Boolean);
  const extra = config.classification.filter((c) => !known.includes(c));
  if (extra.length) {
    throw new DraftShapeError(
      `classification has questions the wizard cannot place: ${extra.map((c) => c.id).join(", ")}.`
    );
  }

  const dims = config.dimensions;
  const usedDims = new Set<string>();
  const compared: ComparisonRow[] = config.comparison.dimensions.map((c) => {
    const dimensionId = matchDimension(c, dims.filter((d) => !usedDims.has(d.id)));
    if (dimensionId) usedDims.add(dimensionId);
    return { ...row(c), dimensionId, enabled: true, auto: false };
  });
  // Dimensions the config does not compare head to head: listed but switched off.
  const comparisons = [...compared];
  for (const d of dims) {
    if (!usedDims.has(d.id)) comparisons.push({ ...autoComparison(row(d), comparisons.map((c) => c.id)), enabled: false });
  }

  const defaultSeverity = clinicalConfig.classification.find((c) => c.id === "harm_severity")!;
  const defaultHarm = clinicalConfig.classification.find((c) => c.id === "patient_harm")!;

  return {
    key: config.key,
    name: config.name,
    scale: { labels: [...config.scale.labels], meanings: [...config.scale.meanings] },
    groups: { ...DEFAULT_GROUPS, ...config.groups },
    dimensions: dims.map(row),
    comparisons,
    errorCategories: { ...row(error), options: [...error.options] },
    severity: {
      enabled: Boolean(severity?.options),
      question: severity?.options
        ? { ...row(severity), options: [...severity.options] }
        : { ...row(defaultSeverity), options: [...defaultSeverity.options!] },
      harm: harm ? row(harm) : row(defaultHarm),
    },
    extent: { ...row(extent), options: [...extent.options] },
    safetyDimensionId: rules.safetyDimension ?? "",
    written: config.written.map(row),
    text: { ...(config.text ?? DEFAULT_TEXT) },
    preferred: { ...row(config.comparison.preferred), options: [...config.comparison.preferred.options] },
    tieOptions: [...config.comparison.tieOptions],
    confidence: { ...row(config.comparison.confidence), scaleLabels: [...config.comparison.confidence.scaleLabels] },
    safetyOverride: {
      ...row(config.comparison.safetyOverride),
      options: [...config.comparison.safetyOverride.options],
    },
    comparisonWritten: config.comparison.written.map(row),
    signoff: { label: config.signoff.label, options: [...config.signoff.options] },
  };
}

export function configFromDraft(
  draft: RubricDraft,
  instructions: string,
  timing: { claim_minutes: number; max_credited_seconds_per_item: number }
): PairwiseConfig {
  const sev = draft.severity.enabled;
  const q = (r: Row): Question => ({ id: r.id, label: r.label, help: r.help });
  return {
    key: draft.key,
    name: draft.name,
    instructions,
    scale: { labels: [...draft.scale.labels], meanings: [...draft.scale.meanings] },
    groups: { ...draft.groups },
    dimensions: draft.dimensions.map(q),
    classification: [
      { ...q(draft.errorCategories), options: [...draft.errorCategories.options] },
      ...(sev ? [{ ...q(draft.severity.question), options: [...draft.severity.question.options] }] : []),
      { ...q(draft.extent), options: [...draft.extent.options] },
      ...(sev ? [q(draft.severity.harm)] : []),
    ],
    consistency: {
      errorType: draft.errorCategories.id,
      errorExtent: draft.extent.id,
      harmSeverity: sev ? draft.severity.question.id : undefined,
      harm: sev ? draft.severity.harm.id : undefined,
      safetyDimension: draft.dimensions.some((d) => d.id === draft.safetyDimensionId)
        ? draft.safetyDimensionId
        : undefined,
    },
    written: draft.written.map(q),
    comparison: {
      preferred: { ...q(draft.preferred), options: [...draft.preferred.options] },
      dimensions: draft.comparisons.filter((c) => c.enabled).map(q),
      tieOptions: [...draft.tieOptions],
      confidence: { ...q(draft.confidence), scaleLabels: [...draft.confidence.scaleLabels] },
      safetyOverride: { ...q(draft.safetyOverride), options: [...draft.safetyOverride.options] },
      written: draft.comparisonWritten.map(q) as [Question, Question, Question, Question],
    },
    signoff: { label: draft.signoff.label, options: [draft.signoff.options[0], draft.signoff.options[1]] },
    text: { ...draft.text },
    timing,
  };
}

export function defaultDraft(): RubricDraft {
  return draftFromConfig(clinicalConfig);
}

/** Markdown instructions for a new rubric, with the rating scale table filled in. */
export function scaleTableMarkdown(scale: { labels: string[]; meanings: string[] }): string {
  const rows = scale.labels
    .map((l, i) => `| ${i + 1} | ${l} | ${scale.meanings[i] ?? ""} |`)
    .reverse()
    .join("\n");
  return `## Common rating scale\n\n| Score | Performance level | General standard |\n|---|---|---|\n${rows}\n`;
}

/** Replaces the "## Common rating scale" section of the instructions, or appends one. */
export function withScaleTable(instructions: string, scale: { labels: string[]; meanings: string[] }): string {
  const table = scaleTableMarkdown(scale);
  const start = instructions.indexOf("## Common rating scale");
  if (start === -1) return `${instructions.trimEnd()}${instructions.trim() ? "\n\n" : ""}${table}`;
  const rest = instructions.slice(start + 2);
  const next = rest.search(/\n## /);
  const end = next === -1 ? instructions.length : start + 2 + next + 1;
  return `${instructions.slice(0, start)}${table}${end < instructions.length ? `\n${instructions.slice(end)}` : ""}`;
}

// ---------------------------------------------------------------------------------------------
// validation (shared by the wizard, the import, and the server)

const idRe = /^[a-z][a-z0-9_]*$/;
const id = z.string().regex(idRe, "Use lowercase letters, digits and underscores, starting with a letter");
const label = z.string().trim().min(1, "Required").max(200, "Keep it under 200 characters");
const help = z.string().max(2000, "Keep it under 2,000 characters");
const rowSchema = z.object({ id, label, help });
const option = z.string().trim().min(1, "Option text is required").max(200, "Keep it under 200 characters");
const uniqueOptions = (min: number, what: string) =>
  z
    .array(option)
    .min(min, `Add at least ${min} ${what}`)
    .max(30, "At most 30 options")
    .refine((o) => new Set(o).size === o.length, "Options must be unique");

const uniqueIds = <T extends { id: string }>(rows: T[], ctx: z.RefinementCtx, path: (string | number)[]) => {
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    if (seen.has(r.id)) ctx.addIssue({ code: "custom", path: [...path, i, "label"], message: `Duplicate name (id "${r.id}")` });
    seen.add(r.id);
  });
};

export const rubricDraftSchema = z
  .object({
    key: z.string().max(60),
    name: z.string().max(120),
    scale: z.object({
      labels: z.array(label).length(5, "The scale has exactly 5 levels"),
      meanings: z.array(z.string().max(500)).length(5, "The scale has exactly 5 levels"),
    }),
    groups: z.object({ ratings: label, classification: label, written: label }),
    dimensions: z.array(rowSchema).min(MIN_DIMENSIONS, `Keep at least ${MIN_DIMENSIONS} rating dimensions`).max(25, "At most 25 dimensions"),
    comparisons: z.array(rowSchema.extend({ dimensionId: z.string(), enabled: z.boolean(), auto: z.boolean() })),
    errorCategories: rowSchema.extend({ options: uniqueOptions(3, "error categories") }),
    severity: z.object({
      enabled: z.boolean(),
      question: rowSchema.extend({ options: uniqueOptions(2, "severity levels") }),
      harm: rowSchema,
    }),
    extent: rowSchema.extend({ options: uniqueOptions(2, "extent levels") }),
    safetyDimensionId: z.string(),
    written: z.array(rowSchema).min(1, "Keep at least 1 written prompt").max(12, "At most 12 written prompts"),
    text: z.object({
      minLength: z.number().int().min(0, "Cannot be negative").max(5000),
      maxLength: z.number().int().min(1, "Must be at least 1").max(20000, "At most 20,000"),
    }),
    preferred: rowSchema.extend({ options: uniqueOptions(2, "options") }),
    tieOptions: uniqueOptions(3, "options").refine((o) => o.length === 3, "Exactly 3 options: A, B, tie"),
    confidence: rowSchema.extend({ scaleLabels: z.array(label).length(5, "Exactly 5 labels") }),
    safetyOverride: rowSchema.extend({
      options: uniqueOptions(4, "options"),
    }),
    comparisonWritten: z.array(rowSchema).length(4, "Part 3 has exactly 4 written answers"),
    signoff: z.object({ label, options: z.array(option).length(2, "Exactly 2 options") }),
  })
  .superRefine((d, ctx) => {
    uniqueIds(d.dimensions, ctx, ["dimensions"]);
    uniqueIds(d.written, ctx, ["written"]);
    uniqueIds(d.comparisonWritten, ctx, ["comparisonWritten"]);
    const enabledIds = d.comparisons.filter((c) => c.enabled).map((c) => c.id);
    const clash = enabledIds.filter((x, i) => enabledIds.indexOf(x) !== i || RESERVED_COMPARISON_IDS.includes(x));
    if (clash.length) ctx.addIssue({ code: "custom", path: ["comparisons"], message: `Comparison ids clash: ${clash.join(", ")}` });
    const cls = [d.errorCategories.id, d.extent.id, ...(d.severity.enabled ? [d.severity.question.id, d.severity.harm.id] : [])];
    if (new Set(cls).size !== cls.length) {
      ctx.addIssue({ code: "custom", path: ["extent", "label"], message: "Classification questions need different ids" });
    }
    const p1 = new Set([...d.dimensions.map((x) => x.id), ...d.written.map((x) => x.id)]);
    for (const c of cls) {
      if (p1.has(c)) ctx.addIssue({ code: "custom", path: ["errorCategories", "label"], message: `"${c}" is used twice in parts 1 and 2` });
    }
    for (const w of d.written) {
      if (d.dimensions.some((x) => x.id === w.id)) {
        ctx.addIssue({ code: "custom", path: ["written"], message: `"${w.id}" is both a dimension and a written prompt` });
      }
    }
    const opts = d.errorCategories.options;
    if (opts.length && !/^no material/i.test(opts[0])) {
      ctx.addIssue({ code: "custom", path: ["errorCategories", "options", 0], message: `The first category must be the "no error" answer (e.g. "${NO_ERROR_OPTION}")` });
    }
    if (opts.length && opts[opts.length - 1] !== OTHER_OPTION) {
      ctx.addIssue({ code: "custom", path: ["errorCategories", "options", opts.length - 1], message: `The last category must be "${OTHER_OPTION}"` });
    }
    if (d.text.minLength > d.text.maxLength) {
      ctx.addIssue({ code: "custom", path: ["text", "minLength"], message: "Minimum length is above the maximum" });
    }
  });

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError, prefix = ""): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = [prefix, ...issue.path.map(String)].filter(Boolean).join(".") || prefix || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// import / export of config files

const questionSchema = z.object({ id, label, help: help.default("") });
export const pairwiseConfigSchema = z.object({
  key: z.string().max(60).default("custom"),
  name: z.string().max(120).default("Imported rubric"),
  instructions: z.string().max(50000).default(""),
  scale: z.object({
    labels: z.array(label).length(5, "Exactly 5 scale labels"),
    meanings: z.array(z.string().max(500)).length(5, "Exactly 5 scale meanings"),
  }),
  groups: z.object({ ratings: label.optional(), classification: label.optional(), written: label.optional() }).optional(),
  dimensions: z.array(questionSchema).min(MIN_DIMENSIONS, `At least ${MIN_DIMENSIONS} dimensions`),
  classification: z.array(questionSchema.extend({ options: z.array(option).min(2).optional() })).min(2, "At least 2 questions"),
  consistency: z
    .object({
      errorType: z.string().optional(),
      errorExtent: z.string().optional(),
      harmSeverity: z.string().optional(),
      harm: z.string().optional(),
      safetyDimension: z.string().optional(),
    })
    .optional(),
  written: z.array(questionSchema).min(1, "At least 1 written prompt"),
  comparison: z.object({
    preferred: questionSchema.extend({ options: z.array(option).min(2) }),
    dimensions: z.array(questionSchema),
    tieOptions: z.array(option).length(3, "Exactly 3 options"),
    confidence: questionSchema.extend({ scaleLabels: z.array(label).length(5, "Exactly 5 labels") }),
    safetyOverride: questionSchema.extend({ options: z.array(option).min(4, "At least 4 options") }),
    written: z.array(questionSchema).length(4, "Exactly 4 written answers"),
  }),
  signoff: z.object({ label, options: z.array(option).length(2, "Exactly 2 options") }),
  text: z.object({ minLength: z.number().int().min(0), maxLength: z.number().int().min(1) }).optional(),
  timing: z
    .object({
      claim_minutes: z.number().int().min(5).max(1440),
      max_credited_seconds_per_item: z.number().int().min(60).max(14400),
    })
    .default({ claim_minutes: 90, max_credited_seconds_per_item: 3600 }),
});

export type ImportResult =
  | { ok: true; draft: RubricDraft; instructions: string; timing: PairwiseConfig["timing"] }
  | { ok: false; errors: { path: string; message: string }[] };

/** Validates a pasted or uploaded JSON config. Never throws; errors are listed per field. */
export function parseRubricImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [{ path: "(file)", message: `Not valid JSON: ${(e as Error).message}` }] };
  }
  const parsed = pairwiseConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({
        path: i.path.length ? i.path.map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`)).join("").replace(/^\./, "") : "(root)",
        message: i.message,
      })),
    };
  }
  let draft: RubricDraft;
  try {
    draft = draftFromConfig(parsed.data as PairwiseConfig);
  } catch (e) {
    return { ok: false, errors: [{ path: "classification", message: (e as Error).message }] };
  }
  const check = rubricDraftSchema.safeParse(draft);
  if (!check.success) {
    return {
      ok: false,
      errors: Object.entries(zodFieldErrors(check.error)).map(([path, message]) => ({ path, message })),
    };
  }
  return { ok: true, draft, instructions: parsed.data.instructions, timing: parsed.data.timing };
}

/** A minimal config to fill in, offered as "Download blank config". */
export function blankConfig(): PairwiseConfig {
  const dims = [1, 2, 3].map((n) => ({
    id: `dimension_${n}`,
    label: `Dimension ${n}`,
    help: "What this dimension measures. What earns a 1, and what earns a 5.",
  }));
  return {
    key: "custom",
    name: "My rubric",
    instructions: `## Instructions for evaluators\n\n- Evaluate Response A and Response B independently before comparing them.\n\n${scaleTableMarkdown(clinicalConfig.scale)}`,
    scale: { labels: [...clinicalConfig.scale.labels], meanings: ["", "", "", "", ""] },
    dimensions: dims,
    classification: [
      { id: "primary_error", label: "Primary Error Classification", help: "The single most consequential error.", options: [NO_ERROR_OPTION, "Error category 1", OTHER_OPTION] },
      { id: "error_extent", label: "Error Extent", help: "How much of the response is affected?", options: ["No material errors", "One minor issue", "One major issue"] },
    ],
    consistency: { errorType: "primary_error", errorExtent: "error_extent" },
    written: [{ id: "critique", label: "Detailed Critique & Rationale", help: "Explain your scores." }],
    comparison: {
      preferred: { ...clinicalConfig.comparison.preferred, help: "Which response is better overall?" },
      dimensions: dims.map((d) => ({ id: d.id, label: d.label, help: `Which response is better on ${d.label}? ${TIE_HELP}` })),
      tieOptions: [...clinicalConfig.comparison.tieOptions],
      confidence: clinicalConfig.comparison.confidence,
      safetyOverride: clinicalConfig.comparison.safetyOverride,
      written: clinicalConfig.comparison.written,
    },
    signoff: { label: "Review status", options: ["Complete", "Requires senior review"] },
    text: { ...DEFAULT_TEXT },
    timing: { claim_minutes: 90, max_credited_seconds_per_item: 3600 },
  };
}
