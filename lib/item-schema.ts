import { z } from "zod";

type Base = {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
};

export type Field =
  | (Base & { type: "rating"; min: number; max: number })
  | (Base & { type: "select"; options: string[] })
  | (Base & { type: "multiselect"; options: string[] })
  | (Base & { type: "boolean" })
  | (Base & { type: "text"; minLength?: number; maxLength?: number });

export function buildAnswersSchema(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const f of fields || []) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "rating":
        s = z.coerce
          .number({
            message: `${f.label} must be a number`,
          })
          .int()
          .min(f.min, `Minimum rating is ${f.min}`)
          .max(f.max, `Maximum rating is ${f.max}`);
        break;

      case "select":
        if (f.options && f.options.length > 0) {
          s = z.string().refine((val) => f.options.includes(val), {
            message: `Please choose a valid option for ${f.label}`,
          });
        } else {
          s = z.string();
        }
        break;

      case "multiselect":
        s = z.array(z.string()).refine(
          (arr) => arr.every((v) => (f.options || []).includes(v)),
          { message: `Invalid selection in ${f.label}` }
        );
        if (f.required !== false) {
          s = (s as z.ZodArray<any>).min(1, `Please select at least one option for ${f.label}`);
        }
        break;

      case "boolean":
        s = z.boolean({
          message: `${f.label} must be true or false`,
        });
        break;

      case "text":
        const minL = f.minLength ?? (f.required === false ? 0 : 1);
        const maxL = f.maxLength ?? 4000;
        let textValidator = z.string().trim();
        if (minL > 0) {
          textValidator = textValidator.min(
            minL,
            minL === 1 ? `${f.label} is required` : `${f.label} must be at least ${minL} characters`
          );
        }
        textValidator = textValidator.max(maxL, `${f.label} cannot exceed ${maxL} characters`);
        s = textValidator;
        break;

      default:
        s = z.any();
        break;
    }

    shape[f.id] = f.required === false ? s.optional().nullable() : s;
  }

  return z.object(shape).strict(); // unknown keys are rejected
}
