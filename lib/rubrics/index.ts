// Every pairwise evaluation template. Add a new domain by writing a config file and listing it here.
import type { Field } from "../item-schema";
import { buildPairwiseForm, pairwiseFlags, type PairwiseConfig } from "./build-pairwise-form";
import { inferPairwiseConfig, scaleMeaningsFromMarkdown } from "./infer";
import { clinicalConfig } from "./clinical";
import { pythonCodeReviewConfig } from "./python-code-review";

export const PAIRWISE_TEMPLATES: PairwiseConfig[] = [clinicalConfig, pythonCodeReviewConfig];

export function getTemplate(key: string | null | undefined): PairwiseConfig | undefined {
  return PAIRWISE_TEMPLATES.find((t) => t.key === key);
}

const idSignatures = new Map(
  PAIRWISE_TEMPLATES.map((t) => [t.key, buildPairwiseForm(t).item_schema.map((f) => f.id).join("|")])
);

/**
 * Which template a saved form was built from. Field ids are fixed by the template (admins
 * can only reword), so the id list identifies it. Returns undefined for any other form.
 */
export function detectTemplate(fields: unknown): PairwiseConfig | undefined {
  if (!Array.isArray(fields)) return undefined;
  const sig = (fields as Field[]).map((f) => f?.id).join("|");
  return PAIRWISE_TEMPLATES.find((t) => idSignatures.get(t.key) === sig);
}

/**
 * The editable config behind a saved pairwise form, with its current wording. Known templates keep
 * their key, name, scale meanings and consistency rules. Undefined if the form is not pairwise.
 */
export function configFromTask(
  fields: unknown,
  instructions?: string | null,
  timing?: { claim_minutes?: number | null; max_credited_seconds_per_item?: number | null }
): PairwiseConfig | undefined {
  const inferred = inferPairwiseConfig(fields, instructions ?? "");
  if (!inferred) return undefined;
  const template = detectTemplate(fields);
  const config: PairwiseConfig = template
    ? {
        ...inferred,
        key: template.key,
        name: template.name,
        consistency: template.consistency,
        scale: { labels: inferred.scale.labels, meanings: [...template.scale.meanings] },
      }
    : inferred;
  if (timing?.claim_minutes) config.timing = { ...config.timing, claim_minutes: timing.claim_minutes };
  if (timing?.max_credited_seconds_per_item) {
    config.timing = { ...config.timing, max_credited_seconds_per_item: timing.max_credited_seconds_per_item };
  }
  return config;
}

/** Soft consistency warnings for a submission. Empty for forms that are not pairwise. */
export function formFlags(fields: Field[], answers: Record<string, unknown>): string[] {
  const config = configFromTask(fields);
  return config ? pairwiseFlags(config, fields, answers) : [];
}

/**
 * What each score means (index 0 = lowest), for the work screen's "Rating scale" panel.
 * Known templates carry their own; any other form reads the scale table in its instructions.
 */
export function scaleMeanings(fields: Field[], instructions?: string | null): string[] {
  const template = detectTemplate(fields);
  if (template) return template.scale.meanings;
  const rating = fields.find((f) => f.type === "rating" && f.scaleLabels?.length) as
    | Extract<Field, { type: "rating" }>
    | undefined;
  return rating?.scaleLabels ? scaleMeaningsFromMarkdown(instructions, rating.scaleLabels) : [];
}
