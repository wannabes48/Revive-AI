"use client";

// Small, accessible form pieces for the task wizard: every input has a label, help text and an
// inline error tied to it with aria-describedby.
import * as React from "react";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { slugId, uniqueId, type Row } from "@/lib/task-wizard/rubric";

export type Errors = Record<string, string>;

const inputBase =
  "w-full min-w-0 rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/25 focus-visible:border-primary disabled:opacity-60 disabled:cursor-not-allowed read-only:bg-muted/40";

function describedBy(id: string, help?: React.ReactNode, error?: string) {
  return [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function FieldShell({
  id, label, help, error, required, children, className = "",
}: {
  id: string; label: React.ReactNode; help?: React.ReactNode; error?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1.5 min-w-0 ${className}`}>
      <label htmlFor={id} className="block text-xs font-semibold text-foreground">
        {label} {required && <span className="text-destructive" aria-hidden>*</span>}
      </label>
      {children}
      {help && <p id={`${id}-help`} className="text-[11px] text-muted-foreground leading-relaxed">{help}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-[11px] font-semibold text-destructive">{error}</p>}
    </div>
  );
}

type TextProps = {
  id: string; label: React.ReactNode; value: string; onChange: (v: string) => void;
  help?: React.ReactNode; error?: string; required?: boolean; placeholder?: string;
  disabled?: boolean; readOnly?: boolean; className?: string; inputClassName?: string;
  onBlur?: () => void; maxLength?: number; type?: string; inputMode?: "decimal" | "numeric";
};

export function TextField(p: TextProps) {
  return (
    <FieldShell id={p.id} label={p.label} help={p.help} error={p.error} required={p.required} className={p.className}>
      <input
        id={p.id}
        type={p.type ?? "text"}
        inputMode={p.inputMode}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        placeholder={p.placeholder}
        disabled={p.disabled}
        readOnly={p.readOnly}
        maxLength={p.maxLength}
        aria-invalid={Boolean(p.error) || undefined}
        aria-describedby={describedBy(p.id, p.help, p.error)}
        className={`${inputBase} h-10 ${p.error ? "border-destructive" : "border-border"} ${p.inputClassName ?? ""}`}
      />
    </FieldShell>
  );
}

export function TextAreaField(p: TextProps & { rows?: number }) {
  return (
    <FieldShell id={p.id} label={p.label} help={p.help} error={p.error} required={p.required} className={p.className}>
      <textarea
        id={p.id}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        rows={p.rows ?? 3}
        placeholder={p.placeholder}
        disabled={p.disabled}
        readOnly={p.readOnly}
        maxLength={p.maxLength}
        aria-invalid={Boolean(p.error) || undefined}
        aria-describedby={describedBy(p.id, p.help, p.error)}
        className={`${inputBase} py-2 leading-relaxed resize-y ${p.error ? "border-destructive" : "border-border"} ${p.inputClassName ?? ""}`}
      />
    </FieldShell>
  );
}

/** A number input that keeps what the admin typed until it parses. */
export function NumberField(p: Omit<TextProps, "value" | "onChange"> & {
  value: number | null; onChange: (v: number | null) => void; step?: string; prefix?: string; suffix?: string;
}) {
  const [text, setText] = React.useState(p.value === null || Number.isNaN(p.value) ? "" : String(p.value));
  const [prevValue, setPrevValue] = React.useState(p.value);
  if (!Object.is(prevValue, p.value)) {
    // The value changed from outside (template, import, restore): show it.
    // Object.is, not !==: NaN (a half-typed number) must equal itself or this would loop.
    setPrevValue(p.value);
    if (!Object.is(Number(text), p.value)) setText(p.value === null || Number.isNaN(p.value) ? "" : String(p.value));
  }
  return (
    <FieldShell id={p.id} label={p.label} help={p.help} error={p.error} required={p.required} className={p.className}>
      <div className="relative">
        {p.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground" aria-hidden>{p.prefix}</span>}
        <input
          id={p.id}
          type="text"
          inputMode={p.inputMode ?? "decimal"}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            const n = v.trim() === "" ? null : Number(v);
            setPrevValue(n === null || Number.isNaN(n) ? NaN : n);
            p.onChange(n === null ? null : Number.isNaN(n) ? NaN : n);
          }}
          disabled={p.disabled}
          aria-invalid={Boolean(p.error) || undefined}
          aria-describedby={describedBy(p.id, p.help, p.error)}
          className={`${inputBase} h-10 font-mono ${p.prefix ? "pl-7" : ""} ${p.suffix ? "pr-14" : ""} ${p.error ? "border-destructive" : "border-border"}`}
        />
        {p.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" aria-hidden>{p.suffix}</span>}
      </div>
    </FieldShell>
  );
}

export function SelectField({
  id, label, value, onChange, options, help, error, disabled, className,
}: {
  id: string; label: React.ReactNode; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; help?: React.ReactNode; error?: string; disabled?: boolean; className?: string;
}) {
  return (
    <FieldShell id={id} label={label} help={help} error={error} className={className}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, help, error)}
        className={`${inputBase} h-10 ${error ? "border-destructive" : "border-border"}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Toggle({
  id, checked, onChange, label, help, disabled,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; help?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={help ? `${id}-help` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        }`}
      >
        <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
      </button>
      <div className="min-w-0">
        <label htmlFor={id} className="text-xs font-semibold text-foreground cursor-pointer">{label}</label>
        {help && <p id={`${id}-help`} className="text-[11px] text-muted-foreground leading-relaxed">{help}</p>}
      </div>
    </div>
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Repeatable rows with a name and help text. New rows get a placeholder id that follows the name
 * until the row is saved; existing ids never change (answers are stored under them).
 */
export function RowsEditor({
  idBase, rows, onChange, errors, errorPrefix, min = 0, max = 30, locked, nameLabel, helpLabel, helpPlaceholder, addLabel, newIdPrefix, lockedNote,
}: {
  idBase: string; rows: Row[]; onChange: (rows: Row[]) => void; errors: Errors; errorPrefix: string;
  min?: number; max?: number; locked?: boolean; nameLabel: string; helpLabel: string; helpPlaceholder?: string;
  addLabel: string; newIdPrefix: string; lockedNote?: string;
}) {
  const placeholderId = new RegExp(`^${newIdPrefix}(_\\d+)?$`);
  const update = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const listError = errors[errorPrefix];
  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={`${r.id}-${i}`} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-9 text-[11px] font-mono font-bold text-muted-foreground w-5 shrink-0 text-right" aria-hidden>{i + 1}</span>
              <div className="flex-1 min-w-0 space-y-2">
                <TextField
                  id={`${idBase}-${i}-label`}
                  label={`${nameLabel} ${i + 1}`}
                  value={r.label}
                  onChange={(v) => update(i, { label: v })}
                  onBlur={() => {
                    if (!locked && placeholderId.test(r.id) && r.label.trim()) {
                      const others = rows.filter((_, j) => j !== i).map((x) => x.id);
                      update(i, { id: uniqueId(slugId(r.label, newIdPrefix), others) });
                    }
                  }}
                  error={errors[`${errorPrefix}.${i}.label`] ?? errors[`${errorPrefix}.${i}.id`]}
                  maxLength={200}
                />
                <TextAreaField
                  id={`${idBase}-${i}-help`}
                  label={helpLabel}
                  value={r.help}
                  onChange={(v) => update(i, { help: v })}
                  placeholder={helpPlaceholder}
                  rows={2}
                  error={errors[`${errorPrefix}.${i}.help`]}
                  maxLength={2000}
                />
              </div>
              {!locked && (
                <div className="flex flex-col gap-1.5 pt-6 shrink-0">
                  <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${r.label || `row ${i + 1}`} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" className={iconBtn} disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${r.label || `row ${i + 1}`} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`${iconBtn} hover:text-destructive`}
                    disabled={rows.length <= min}
                    title={rows.length <= min ? `Keep at least ${min}` : undefined}
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    aria-label={`Remove ${r.label || `row ${i + 1}`}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {listError && <p role="alert" className="text-[11px] font-semibold text-destructive">{listError}</p>}
      {locked ? (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Lock className="h-3 w-3" /> {lockedNote ?? "Rows are locked because this task has submissions. You can still reword them."}</p>
      ) : (
        <button
          type="button"
          disabled={rows.length >= max}
          onClick={() => onChange([...rows, { id: uniqueId(newIdPrefix, rows.map((r) => r.id)), label: "", help: "" }])}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-dashed border-primary/50 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

/** A list of answer options. The first and/or last can be fixed (shown, not editable or removable). */
export function OptionsEditor({
  idBase, legend, options, onChange, errors, errorPrefix, fixedFirst, fixedLast, min = 2, locked, help,
}: {
  idBase: string; legend: string; options: string[]; onChange: (o: string[]) => void; errors: Errors; errorPrefix: string;
  fixedFirst?: boolean; fixedLast?: boolean; min?: number; locked?: boolean; help?: React.ReactNode;
}) {
  const isFixed = (i: number) => locked || (fixedFirst && i === 0) || (fixedLast && i === options.length - 1);
  const insertAt = fixedLast ? options.length - 1 : options.length;
  return (
    <fieldset className="space-y-2 min-w-0">
      <legend className="text-xs font-semibold text-foreground mb-1">{legend}</legend>
      {help && <p className="text-[11px] text-muted-foreground -mt-1">{help}</p>}
      <ol className="space-y-1.5">
        {options.map((o, i) => (
          <li key={i} className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono text-muted-foreground w-5 shrink-0 text-right" aria-hidden>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <label htmlFor={`${idBase}-${i}`} className="sr-only">{`${legend}, option ${i + 1}`}</label>
              <input
                id={`${idBase}-${i}`}
                value={o}
                readOnly={isFixed(i)}
                onChange={(e) => onChange(options.map((x, j) => (j === i ? e.target.value : x)))}
                aria-invalid={Boolean(errors[`${errorPrefix}.${i}`]) || undefined}
                aria-describedby={errors[`${errorPrefix}.${i}`] ? `${idBase}-${i}-error` : undefined}
                maxLength={200}
                className={`${inputBase} h-9 ${errors[`${errorPrefix}.${i}`] ? "border-destructive" : "border-border"}`}
              />
              {errors[`${errorPrefix}.${i}`] && (
                <p id={`${idBase}-${i}-error`} role="alert" className="mt-1 text-[11px] font-semibold text-destructive">{errors[`${errorPrefix}.${i}`]}</p>
              )}
            </div>
            {isFixed(i) ? (
              <span className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground shrink-0" title={locked ? "Locked" : "Fixed option"}>
                <Lock className="h-3.5 w-3.5" aria-label={locked ? "Locked" : "Fixed option"} />
              </span>
            ) : (
              <button
                type="button"
                className={`${iconBtn} hover:text-destructive shrink-0`}
                disabled={options.length <= min}
                onClick={() => onChange(options.filter((_, j) => j !== i))}
                aria-label={`Remove option ${o || i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ol>
      {errors[errorPrefix] && <p role="alert" className="text-[11px] font-semibold text-destructive">{errors[errorPrefix]}</p>}
      {!locked && (
        <button
          type="button"
          onClick={() => onChange([...options.slice(0, insertAt), "", ...options.slice(insertAt)])}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-dashed border-primary/50 text-xs font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>
      )}
    </fieldset>
  );
}

export function Section({ title, description, children, id }: { title: string; description?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="bg-card rounded-[14px] border border-border p-4 sm:p-6 shadow-2xs space-y-4 min-w-0">
      <div>
        <h3 id={id ? `${id}-title` : undefined} className="font-heading text-base font-bold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {children}
    </section>
  );
}
