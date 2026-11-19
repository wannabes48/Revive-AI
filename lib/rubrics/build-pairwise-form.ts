// The shared structure of every pairwise evaluation task (build guide Part 6, sections 64-69).
//
//   Part 1  Response A on its own        shows prompt + response_a
//   Part 2  Response B on its own        shows prompt + response_b
//   Part 3  Head-to-head comparison      shows all three, opens after parts 1 and 2
//   Sign-off                             opens after part 3
//
// A domain config (lib/rubrics/<domain>.ts) supplies only the wording. Never hand-write
// item_schema for a new evaluation task: add a config and build it with buildPairwiseForm().
//
// Key order inside each field object is deliberate: the clinical form must stay byte-identical
// to tests/fixtures/task_form.json, which pins the form contributors already use.
import type { Field, Part } from "../item-schema";

export type Question = { id: string; label: string; help: string };
export type ChoiceQuestion = Question & { options: string[] };

export type PairwiseConfig = {
  /** Stable key, e.g. "clinical". Used by the admin template dropdown. */
  key: string;
  /** Name shown in the admin template dropdown. */
  name: string;
  /** Markdown shown in "Task Guidelines & Instructions". */
  instructions: string;

  /** The 1-5 quality scale used by every rating dimension. */
  scale: { labels: string[]; meanings: string[] };

  /** Group headings inside parts 1 and 2. */
  groups?: { ratings?: string; classification?: string; written?: string };

  /** "A. Quality ratings": one 1-5 rating per dimension. */
  dimensions: Question[];

  /**
   * "B. Error and safety classification", in display order. A question with options is a
   * single choice (radio up to 7 options, dropdown above); one without options is yes/no.
   * Put the "nothing wrong" answer first in each list: the consistency checks rely on it.
   */
  classification: (Question & { options?: string[] })[];

  /** Which classification ids the consistency checks read. Omit to skip those checks. */
  consistency?: {
    errorType?: string;
    errorExtent?: string;
    harmSeverity?: string;
    /** yes/no question: "could this cause harm?" */
    harm?: string;
    /** rating dimension compared against the safety override */
    safetyDimension?: string;
  };

  /** "C. Detailed written assessment". */
  written: Question[];

  comparison: {
    preferred: ChoiceQuestion;
    /** One A / B / Tie question per compared dimension, in display order. */
    dimensions: Question[];
    /** Options for each dimension comparison, e.g. ["Response A", "Response B", "Tie — ..."]. */
    tieOptions: string[];
    confidence: Question & { scaleLabels: string[] };
    /** Options: [no override, A has an issue, B has an issue, both have issues, ...others]. */
    safetyOverride: ChoiceQuestion;
    /** Exactly four written answers. */
    written: [Question, Question, Question, Question];
  };

  signoff: { label: string; options: [string, string] };

  /** Written answer length, the same for every text field. */
  text?: { minLength: number; maxLength: number };

  timing: { claim_minutes: number; max_credited_seconds_per_item: number };
};

export type PairwiseForm = {
  instructions: string;
  item_parts: Part[];
  item_schema: Field[];
  claim_minutes: number;
  max_credited_seconds_per_item: number;
};

export const DEFAULT_GROUPS = {
  ratings: "A. Quality ratings",
  classification: "B. Error and safety classification",
  written: "C. Detailed written assessment",
};

export const DEFAULT_TEXT = { minLength: 20, maxLength: 3000 };

/** The four steps. Fixed for every pairwise task: admins can reword fields, not parts. */
export const PAIRWISE_PARTS: Part[] = [
  { id: "part1", title: "PART 1 — RESPONSE A INDEPENDENT EVALUATION",
    intro: "Complete this section without comparing it to the other response.",
    show: ["prompt", "response_a"] },
  { id: "part2", title: "PART 2 — RESPONSE B INDEPENDENT EVALUATION",
    intro: "Complete this section without comparing it to the other response.",
    show: ["prompt", "response_b"] },
  { id: "part3", title: "PART 3 — HEAD-TO-HEAD COMPARATIVE EVALUATION",
    intro: "Complete this section only after both independent evaluations are finished.",
    show: ["prompt", "response_a", "response_b"], requires: ["part1", "part2"] },
  { id: "signoff", title: "Final evaluator sign-off",
    show: ["prompt", "response_a", "response_b"], requires: ["part3"] },
];

function evaluation(config: PairwiseConfig, side: "A" | "B"): Field[] {
  const p = side.toLowerCase();
  const part = side === "A" ? "part1" : "part2";
  const who = `Response ${side}`;
  const groups = { ...DEFAULT_GROUPS, ...config.groups };
  const text = config.text ?? DEFAULT_TEXT;
  const base = { required: true, part };
  return [
    ...config.dimensions.map((c): Field => ({
      ...base, id: `${p}_${c.id}`, label: `${who} — ${c.label}`, help: c.help,
      type: "rating", min: 1, max: 5, scaleLabels: config.scale.labels, group: groups.ratings,
    })),
    ...config.classification.map((c): Field =>
      c.options
        ? {
            ...base, id: `${p}_${c.id}`, label: `${who} — ${c.label}`, help: c.help,
            type: "select", options: c.options, display: c.options.length > 7 ? "dropdown" : "radio",
            group: groups.classification,
          }
        : {
            ...base, id: `${p}_${c.id}`, label: `${who} — ${c.label}`, help: c.help,
            type: "boolean", group: groups.classification,
          }
    ),
    ...config.written.map((w): Field => ({
      ...base, id: `${p}_${w.id}`, label: `${who} — ${w.label}`, help: w.help,
      type: "text", ...text, group: groups.written,
    })),
  ];
}

function comparison(config: PairwiseConfig): Field[] {
  const c = config.comparison;
  const text = config.text ?? DEFAULT_TEXT;
  const base = { required: true, part: "part3" };
  const label = (l: string) => `Comparison — ${l}`;
  return [
    { ...base, id: `c_${c.preferred.id}`, label: label(c.preferred.label), type: "select",
      options: c.preferred.options, help: c.preferred.help, display: "radio" },
    ...c.dimensions.map((d): Field => ({
      ...base, id: `c_${d.id}`, label: label(d.label), type: "select",
      options: c.tieOptions, help: d.help, display: "radio",
    })),
    { ...base, id: `c_${c.confidence.id}`, label: label(c.confidence.label), type: "rating", min: 1, max: 5,
      scaleLabels: c.confidence.scaleLabels, help: c.confidence.help },
    { ...base, id: `c_${c.safetyOverride.id}`, label: label(c.safetyOverride.label), type: "select",
      options: c.safetyOverride.options, help: c.safetyOverride.help, display: "radio" },
    ...c.written.map((w): Field => ({
      ...base, id: `c_${w.id}`, label: label(w.label), type: "text", help: w.help, ...text,
    })),
  ];
}

export function buildPairwiseForm(config: PairwiseConfig): PairwiseForm {
  const signoff: Field = {
    id: "s_review_status", label: config.signoff.label, type: "select",
    options: [...config.signoff.options], display: "radio", required: true, part: "signoff",
  };
  return {
    instructions: config.instructions,
    item_parts: PAIRWISE_PARTS.map((p) => ({ ...p })),
    item_schema: [...evaluation(config, "A"), ...evaluation(config, "B"), ...comparison(config), signoff],
    claim_minutes: config.timing.claim_minutes,
    max_credited_seconds_per_item: config.timing.max_credited_seconds_per_item,
  };
}

/**
 * Checks that an edited form still has the template's structure: the same parts (ids, titles,
 * case panes, unlock rules) and the same fields (ids, types, parts, scales, number of options).
 * Wording (labels, help, option text, group headings, part intros) may change.
 */
export function checkPairwiseStructure(config: PairwiseConfig, fields: Field[], parts: Part[]): string[] {
  const template = buildPairwiseForm(config);
  const problems: string[] = [];

  const partIds = (parts ?? []).map((p) => p?.id);
  const wantIds = template.item_parts.map((p) => p.id);
  if (partIds.join("|") !== wantIds.join("|")) {
    problems.push(`The ${config.name} form must keep its steps: ${wantIds.join(", ")}. Steps cannot be deleted, added or reordered.`);
  } else {
    template.item_parts.forEach((want, i) => {
      const got = parts[i];
      if (got.title !== want.title) problems.push(`Step "${want.id}" cannot be renamed (title must be "${want.title}").`);
      if ((got.show ?? []).join("|") !== (want.show ?? []).join("|")) problems.push(`Step "${want.id}": the case pane (show) cannot change.`);
      if ((got.requires ?? []).join("|") !== (want.requires ?? []).join("|")) problems.push(`Step "${want.id}": the unlock rule (requires) cannot change.`);
    });
  }

  const byId = new Map((fields ?? []).map((f) => [f?.id, f]));
  for (const want of template.item_schema) {
    const got = byId.get(want.id);
    if (!got) {
      problems.push(`Field "${want.id}" is part of the ${config.name} template and cannot be removed.`);
      continue;
    }
    if (got.type !== want.type) problems.push(`${want.id}: type must stay "${want.type}".`);
    if (got.part !== want.part) problems.push(`${want.id}: must stay in step "${want.part}".`);
    if (want.type === "rating" && got.type === "rating" && (got.min !== want.min || got.max !== want.max)) {
      problems.push(`${want.id}: the scale must stay ${want.min}-${want.max}.`);
    }
    if (want.type === "select" && got.type === "select" && got.options?.length !== want.options.length) {
      problems.push(`${want.id}: keep ${want.options.length} options (you can reword them).`);
    }
  }
  const known = new Set(template.item_schema.map((f) => f.id));
  for (const f of fields ?? []) {
    if (f && !known.has(f.id)) problems.push(`Field "${f.id}" is not part of the ${config.name} template.`);
  }
  return problems;
}

/**
 * Soft consistency checks. They warn the contributor before submit and flag the item for the
 * reviewer; they never block a submission. The "nothing wrong" answers are read from the
 * task's own fields (the first option), so reworded options keep working.
 */
export function pairwiseFlags(
  config: PairwiseConfig,
  fields: Field[],
  answers: Record<string, unknown>
): string[] {
  const rules = config.consistency;
  if (!rules) return [];
  const byId = new Map(fields.map((f) => [f.id, f]));
  const firstOption = (id: string) => {
    const f = byId.get(id);
    return f && f.type === "select" ? f.options[0] : undefined;
  };
  const flags: string[] = [];

  for (const s of ["a", "b"] as const) {
    const who = `Response ${s.toUpperCase()}`;
    const errorId = rules.errorType && `${s}_${rules.errorType}`;
    const extentId = rules.errorExtent && `${s}_${rules.errorExtent}`;
    const severityId = rules.harmSeverity && `${s}_${rules.harmSeverity}`;
    const harmId = rules.harm && `${s}_${rules.harm}`;

    if (errorId && extentId) {
      const noError = firstOption(errorId);
      const noExtent = firstOption(extentId);
      const primary = answers[errorId];
      const extent = answers[extentId];
      if (noError && primary === noError && extent !== undefined && extent !== noExtent) {
        flags.push(`${who}: the primary error is "${noError}" but the error extent is "${extent}".`);
      }
      if (noExtent && extent === noExtent && primary !== undefined && primary !== noError) {
        flags.push(`${who}: the error extent is "${noExtent}" but a primary error is selected.`);
      }
    }
    if (severityId && harmId) {
      const na = firstOption(severityId);
      const severity = answers[severityId];
      const harm = answers[harmId];
      const harmLabel = byId.get(harmId)?.label.replace(`${who} — `, "") ?? "harm";
      if (na && severity === na && harm === true) {
        flags.push(`${who}: severity is "${na}" but "${harmLabel}" is "Yes".`);
      }
      if (na && typeof severity === "string" && severity !== na && harm === false) {
        flags.push(`${who}: a severity is selected but "${harmLabel}" is "No".`);
      }
    }
  }

  const overrideId = `c_${config.comparison.safetyOverride.id}`;
  const override = byId.get(overrideId);
  if (rules.safetyDimension && override?.type === "select") {
    const [, onlyA, onlyB, both] = override.options;
    const chosen = answers[overrideId];
    const named = { a: chosen === onlyA || chosen === both, b: chosen === onlyB || chosen === both };
    for (const s of ["a", "b"] as const) {
      const dimId = `${s}_${rules.safetyDimension}`;
      const score = answers[dimId];
      const dimLabel = byId.get(dimId)?.label.replace(/^Response [AB] — /, "") ?? rules.safetyDimension;
      if (named[s] && typeof score === "number" && score >= 4) {
        flags.push(`The safety override names Response ${s.toUpperCase()}, but its ${dimLabel} rating is ${score}.`);
      }
    }
  }
  return flags;
}
