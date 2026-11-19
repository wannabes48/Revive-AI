"use client";

import * as React from "react";
import { Columns2, FileText, Lock } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import { FieldShell, NumberField, Section, SelectField, TextAreaField, TextField, type Errors } from "./fields";
import type { BasicsState, Template, WizardState } from "./state";

export type TaskSource = { id: string; title: string; slug: string; pairwise: boolean };

export function StepBasics({
  state, setBasics, errors, locked, onTemplate, sources, onCopyFrom,
}: {
  state: WizardState;
  setBasics: (patch: Partial<BasicsState>) => void;
  errors: Errors;
  locked: boolean;
  onTemplate: (t: Template) => void;
  sources: TaskSource[];
  onCopyFrom: (id: string) => void;
}) {
  const b = state.basics;
  const e = (k: string) => errors[`basics.${k}`];
  const hourly = b.pay_model === "hourly";

  return (
    <div className="space-y-5">
      <Section id="basics-task" title="The task" description="What contributors see in the task directory.">
        <TextField
          id="title" label="Title" required value={b.title} error={e("title")} maxLength={160}
          placeholder="e.g. Clinical AI Response Evaluation"
          onChange={(v) => setBasics({ title: v, ...(b.slugTouched ? {} : { slug: slugify(v).slice(0, 80) }) })}
        />
        <TextField
          id="slug" label="URL slug" required value={b.slug} error={e("slug")} maxLength={80}
          help={<>Made from the title; edit it if you like. The task lives at /tasks/{b.slug || "your-slug"}.</>}
          inputClassName="font-mono text-xs"
          onChange={(v) => setBasics({ slug: slugify(v).slice(0, 80), slugTouched: true })}
        />
        <TextField
          id="summary" label="One-line summary" required value={b.summary} error={e("summary")} maxLength={300}
          placeholder="Compare two AI answers to clinical questions and say which is safer."
          onChange={(v) => setBasics({ summary: v })}
        />
        <TextAreaField
          id="description" label="Description" required rows={4} value={b.description} error={e("description")}
          placeholder="Who this is for, what the work involves, and any background you need."
          onChange={(v) => setBasics({ description: v })}
        />
        <FieldShell id="category" label="Category" required error={e("category")}>
          <input
            id="category" list="category-options" value={b.category} maxLength={80}
            onChange={(ev) => setBasics({ category: ev.target.value })}
            aria-invalid={Boolean(e("category")) || undefined}
            aria-describedby={e("category") ? "category-error" : undefined}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus-visible:ring-3 focus-visible:ring-primary/25 focus-visible:border-primary"
          />
          <datalist id="category-options">
            {CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </FieldShell>
      </Section>

      <Section id="basics-pay" title="Pay" description="Same pay models as before: per approved item, or per completed hour on the server work clock.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            id="pay_model" label="Pay model" value={b.pay_model}
            onChange={(v) => setBasics({ pay_model: v as BasicsState["pay_model"] })}
            options={[
              { value: "per_item", label: "Per approved item" },
              { value: "hourly", label: "Hourly (server work clock)" },
            ]}
          />
          <NumberField
            id="rate" label={hourly ? "Rate per completed hour" : "Pay per item"} prefix="$" required
            value={b.rate} error={e("rate")} onChange={(v) => setBasics({ rate: v })}
          />
          {hourly ? (
            <SelectField
              id="auto_approve_hourly" label="Crediting" value={b.auto_approve_hourly ? "true" : "false"}
              onChange={(v) => setBasics({ auto_approve_hourly: v === "true" })}
              help="Review lets you lower or reject time before it is paid."
              options={[
                { value: "true", label: "Credit time on submit" },
                { value: "false", label: "Credit time after review" },
              ]}
            />
          ) : (
            <NumberField
              id="max_open_claims" label="Items one person can hold at once" inputMode="numeric"
              value={b.max_open_claims} error={e("max_open_claims")} onChange={(v) => setBasics({ max_open_claims: v })}
            />
          )}
          <NumberField
            id="budget" label="Budget cap (optional)" prefix="$" value={b.budget} error={e("budget")}
            onChange={(v) => setBasics({ budget: v })}
          />
        </div>

        <details className="group rounded-xl border border-border bg-muted/20">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
            <span>Directory listing details</span>
            <span className="text-muted-foreground font-normal">
              ${b.pay_min ?? "?"}–${b.pay_max ?? "?"}/{b.pay_unit} · {b.commitment} · {b.slots ?? "?"} slots
            </span>
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 pb-4">
            <NumberField id="pay_min" label="Display pay min" prefix="$" value={b.pay_min} error={e("pay_min")} onChange={(v) => setBasics({ pay_min: v })} />
            <NumberField id="pay_max" label="Display pay max" prefix="$" value={b.pay_max} error={e("pay_max")} onChange={(v) => setBasics({ pay_max: v })} />
            <SelectField
              id="pay_unit" label="Display pay unit" value={b.pay_unit} onChange={(v) => setBasics({ pay_unit: v as BasicsState["pay_unit"] })}
              options={[
                { value: "hour", label: "Per hour" }, { value: "task", label: "Per task" },
                { value: "milestone", label: "Per milestone" }, { value: "project", label: "Per project" },
              ]}
            />
            <TextField id="commitment" label="Weekly commitment" value={b.commitment} error={e("commitment")} onChange={(v) => setBasics({ commitment: v })} />
            <TextField id="location" label="Location" value={b.location} error={e("location")} onChange={(v) => setBasics({ location: v })} />
            <NumberField id="slots" label="Slots" inputMode="numeric" value={b.slots} error={e("slots")} onChange={(v) => setBasics({ slots: v })} />
          </div>
        </details>
      </Section>

      <Section
        id="basics-template"
        title="Form template"
        description={locked ? "Locked: this task already has submissions, so its form type cannot change." : "Pick how contributors answer. You can fine-tune the wording in the next step."}
      >
        <div role="radiogroup" aria-label="Form template" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { id: "pairwise", title: "Pairwise evaluation", sub: "Response A vs B, 4 steps", body: "Rate A, rate B, compare head to head, sign off. Loads the clinical rubric as a starting point.", icon: Columns2 },
            { id: "single", title: "Single page", sub: "Custom fields", body: "A short form on one page. Fields are defined in the Advanced section.", icon: FileText },
          ] as const).map((t) => {
            const selected = state.template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={locked && !selected}
                onClick={() => onTemplate(t.id)}
                className={`text-left rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <t.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-heading text-sm font-bold text-foreground">{t.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{t.sub}</span>
                  </span>
                </span>
                <span className="block mt-2 text-xs text-muted-foreground leading-relaxed">{t.body}</span>
              </button>
            );
          })}
        </div>

        <SelectField
          id="copy_from"
          label="Start from an existing task"
          value=""
          disabled={locked || sources.length === 0}
          help={locked ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Not available while the form is locked.</span> : "Copies that task's rubric, instructions and timing into this form. Nothing is copied until you save."}
          onChange={(v) => v && onCopyFrom(v)}
          options={[
            { value: "", label: sources.length ? "Choose a task…" : "No other tasks yet" },
            ...sources.map((s) => ({ value: s.id, label: `${s.title}${s.pairwise ? " — pairwise" : " — single page"}` })),
          ]}
        />
      </Section>
    </div>
  );
}
