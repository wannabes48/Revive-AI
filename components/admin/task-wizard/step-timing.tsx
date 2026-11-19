"use client";

import { AlertTriangle } from "lucide-react";
import { NumberField, Section, type Errors } from "./fields";
import type { WizardState } from "./state";

export function StepTiming({ state, setTiming, errors }: {
  state: WizardState;
  setTiming: (patch: Partial<WizardState["timing"]>) => void;
  errors: Errors;
}) {
  const t = state.timing;
  const over = t.claim_minutes !== null && t.max_credited_minutes !== null && t.max_credited_minutes > t.claim_minutes;
  return (
    <Section id="timing" title="Timing" description="How long a contributor may hold one case, and how much of that time can be paid.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <NumberField
          id="claim_minutes" label="Claim window" suffix="minutes" inputMode="numeric" required
          value={t.claim_minutes} error={errors["timing.claim_minutes"]}
          help="After this long, an unfinished case goes back to the queue for someone else."
          onChange={(v) => setTiming({ claim_minutes: v })}
        />
        <NumberField
          id="max_credited_minutes" label="Maximum credited time per item" suffix="minutes" inputMode="numeric" required
          value={t.max_credited_minutes} error={errors["timing.max_credited_minutes"]}
          help={state.basics.pay_model === "hourly"
            ? "Work-clock time above this on one case is never paid."
            : "Only used by hourly tasks; this task pays per approved item."}
          onChange={(v) => setTiming({ max_credited_minutes: v })}
        />
      </div>
      {over && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          The credited time ({t.max_credited_minutes} min) is longer than the claim window ({t.claim_minutes} min), so the cap can never be reached.
          Lower the cap or lengthen the window.
        </p>
      )}
    </Section>
  );
}
