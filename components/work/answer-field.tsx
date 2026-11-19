"use client";

import * as React from "react";
import type { Field } from "@/lib/item-schema";
import { Label } from "@/components/ui/label";

interface AnswerFieldProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders one answer-form field. Shared by single-page and multi-step forms. */
export function AnswerField({ field, value, onChange }: AnswerFieldProps) {
  const isRequired = field.required !== false;
  const inputId = `f_${field.id}`;

  return (
    <div className="space-y-2 min-w-0" id={`field-${field.id}`}>
      <div className="space-y-0.5">
        <Label htmlFor={inputId} className="text-xs font-semibold text-foreground leading-snug">
          {field.label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
        {field.help && <p className="text-[11px] text-muted-foreground leading-relaxed">{field.help}</p>}
      </div>

      {field.type === "rating" && <RatingInput field={field} value={value} onChange={onChange} />}

      {field.type === "select" &&
        (field.display === "dropdown" ? (
          <select
            id={inputId}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full min-h-[44px] rounded-xl border border-input bg-background px-3 text-base sm:text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Select an option…</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : field.display === "radio" ? (
          <div role="radiogroup" aria-label={field.label} className="grid gap-1.5">
            {field.options.map((opt) => {
              const selected = value === opt;
              return (
                <label
                  key={opt}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={field.id}
                    checked={selected}
                    onChange={() => onChange(opt)}
                    className="mt-0.5 accent-[var(--color-primary,#0F766E)]"
                  />
                  <span className="text-foreground">{opt}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <select
            id={inputId}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full min-h-[44px] rounded-xl border border-input bg-background px-3 text-base sm:text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Select an option…</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ))}

      {field.type === "multiselect" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {field.options.map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(checked ? arr.filter((x) => x !== opt) : [...arr, opt])}
                className={`touch-target px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer min-h-[44px] ${
                  checked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {field.type === "boolean" && (
        <div className="flex items-center gap-3" role="radiogroup" aria-label={field.label}>
          {[
            { v: true, label: "Yes" },
            { v: false, label: "No" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={value === o.v}
              onClick={() => onChange(o.v)}
              className={`touch-target flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer min-h-[44px] ${
                value === o.v
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {field.type === "text" && <TextInput id={inputId} field={field} value={value} onChange={onChange} />}
    </div>
  );
}

function RatingInput({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { type: "rating" }>;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const scores = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
  const labelFor = (score: number) => field.scaleLabels?.[score - field.min];
  const chosen = typeof value === "number" ? value : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {scores.map((score) => {
          const selected = chosen === score;
          return (
            <button
              key={score}
              type="button"
              title={labelFor(score) ? `${score} — ${labelFor(score)}` : String(score)}
              aria-pressed={selected}
              onClick={() => onChange(score)}
              className={`touch-target flex items-center justify-center h-11 w-11 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                selected
                  ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>
      {field.scaleLabels && (
        <p className={`text-[11px] font-semibold ${chosen ? "text-primary" : "text-muted-foreground/70"}`}>
          {chosen ? `${chosen} — ${labelFor(chosen)}` : "Not rated yet"}
        </p>
      )}
    </div>
  );
}

function TextInput({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: Extract<Field, { type: "text" }>;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const text = typeof value === "string" ? value : "";
  const length = text.trim().length;
  const min = field.minLength ?? (field.required === false ? 0 : 1);
  const max = field.maxLength ?? 4000;

  // Grow with the content
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 600)}px`;
  }, [text]);

  const tone = length > max ? "text-destructive" : length < min ? "text-amber-700" : "text-primary";

  return (
    <div className="space-y-1">
      <textarea
        ref={ref}
        id={id}
        value={text}
        maxLength={max + 200}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Write your answer…"
        className="w-full p-3 rounded-xl border border-input bg-background text-base sm:text-xs leading-relaxed text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[88px]"
      />
      <div className={`flex justify-end text-[10px] font-mono ${tone}`}>
        {length} / {max} characters{min > 1 ? ` · minimum ${min}` : ""}
      </div>
    </div>
  );
}
