// Rebuilds a PairwiseConfig from a saved form (item_schema), the inverse of buildPairwiseForm.
// Works for any task built by the builder, including ones made in the admin wizard and ones whose
// wording was edited, so the wizard can edit them and the work screen can run their checks.
import { groupRuns, type Field } from "../item-schema";
import { DEFAULT_GROUPS, DEFAULT_TEXT, type PairwiseConfig, type Question } from "./build-pairwise-form";

const DEFAULT_TIE = ["Response A", "Response B", "Tie — No meaningful difference"];

/** Reads "| 5 | Excellent | meaning |" rows from a markdown scale table (index 0 = score 1). */
export function scaleMeaningsFromMarkdown(markdown: string | null | undefined, labels: string[]): string[] {
  const meanings: string[] = labels.map(() => "");
  for (const line of (markdown ?? "").split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // ["", "5", "Excellent", "meaning", ""]
    if (cells.length < 5) continue;
    const score = Number(cells[1]);
    if (!Number.isInteger(score) || score < 1 || score > labels.length) continue;
    if (cells[3]) meanings[score - 1] = cells[3];
  }
  return meanings;
}

const strip = (label: string, prefix: RegExp) => label.replace(prefix, "");
const q = (f: Field, prefix: RegExp, idPrefix: string): Question => ({
  id: f.id.slice(idPrefix.length),
  label: strip(f.label, prefix),
  help: f.help ?? "",
});

export function inferPairwiseConfig(fields: unknown, instructions = ""): PairwiseConfig | undefined {
  if (!Array.isArray(fields)) return undefined;
  const all = fields as Field[];
  if (!all.every((f) => f && typeof f === "object" && typeof f.id === "string")) return undefined;
  const of = (p: string) => all.filter((f) => f.part === p);
  const a = of("part1");
  const b = of("part2");
  const c = of("part3");
  const s = of("signoff");
  if (a.length === 0 || a.length !== b.length || c.length < 7 || s.length !== 1) return undefined;
  if (a.length + b.length + c.length + s.length !== all.length) return undefined;
  if (!a.every((f) => f.id.startsWith("a_"))) return undefined;
  if (!b.every((f, i) => f.id === `b_${a[i].id.slice(2)}` && f.type === a[i].type)) return undefined;

  const runs = groupRuns(a);
  if (runs.length !== 3) return undefined;
  const [ratings, classification, written] = runs;
  if (!ratings.fields.every((f) => f.type === "rating")) return undefined;
  if (!classification.fields.every((f) => f.type === "select" || f.type === "boolean")) return undefined;
  if (!written.fields.every((f) => f.type === "text")) return undefined;

  const A = /^Response A — /;
  const firstRating = ratings.fields[0] as Extract<Field, { type: "rating" }>;
  const labels = firstRating.scaleLabels ?? ["1", "2", "3", "4", "5"];
  if (labels.length !== 5) return undefined;
  const firstText = written.fields[0] as Extract<Field, { type: "text" }>;

  // Part 3 is: preferred, one comparison per compared dimension, confidence, override, 4 written.
  const C = /^Comparison — /;
  const preferred = c[0];
  const confidence = c[c.length - 6];
  const override = c[c.length - 5];
  const texts = c.slice(-4);
  const compared = c.slice(1, -6);
  if (preferred.type !== "select" || confidence.type !== "rating" || override.type !== "select") return undefined;
  if (!texts.every((f) => f.type === "text") || !compared.every((f) => f.type === "select")) return undefined;
  if (!c.every((f) => f.id.startsWith("c_"))) return undefined;

  const signoff = s[0];
  if (signoff.type !== "select" || signoff.options.length !== 2 || signoff.id !== "s_review_status") return undefined;

  const cls = classification.fields.map((f) =>
    f.type === "select" ? { ...q(f, A, "a_"), options: [...f.options] } : q(f, A, "a_")
  );
  const selects = cls.filter((x) => "options" in x);
  const yesNo = cls.filter((x) => !("options" in x));
  const dimensions = ratings.fields.map((f) => q(f, A, "a_"));

  return {
    key: "custom",
    name: "Custom pairwise evaluation",
    instructions,
    scale: { labels: [...labels], meanings: scaleMeaningsFromMarkdown(instructions, labels) },
    groups: {
      ratings: ratings.group ?? DEFAULT_GROUPS.ratings,
      classification: classification.group ?? DEFAULT_GROUPS.classification,
      written: written.group ?? DEFAULT_GROUPS.written,
    },
    dimensions,
    classification: cls,
    consistency: {
      errorType: selects[0]?.id,
      errorExtent: selects.length >= 2 ? selects[selects.length - 1].id : undefined,
      harmSeverity: selects.length >= 3 ? selects[1].id : undefined,
      harm: selects.length >= 3 ? yesNo[0]?.id : undefined,
      safetyDimension: dimensions.find((d) => /safety|security/i.test(d.id))?.id,
    },
    written: written.fields.map((f) => q(f, A, "a_")),
    comparison: {
      preferred: { ...q(preferred, C, "c_"), options: [...preferred.options] },
      dimensions: compared.map((f) => q(f, C, "c_")),
      tieOptions: compared[0]?.type === "select" ? [...compared[0].options] : DEFAULT_TIE,
      confidence: { ...q(confidence, C, "c_"), scaleLabels: [...(confidence.scaleLabels ?? labels)] },
      safetyOverride: { ...q(override, C, "c_"), options: [...override.options] },
      written: texts.map((f) => q(f, C, "c_")) as [Question, Question, Question, Question],
    },
    signoff: { label: signoff.label, options: [signoff.options[0], signoff.options[1]] },
    text: {
      minLength: firstText.minLength ?? DEFAULT_TEXT.minLength,
      maxLength: firstText.maxLength ?? DEFAULT_TEXT.maxLength,
    },
    timing: { claim_minutes: 90, max_credited_seconds_per_item: 3600 },
  };
}
