"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, FileUp, Lock, PencilLine, RefreshCw } from "lucide-react";
import { SimpleMarkdown } from "@/components/work/simple-markdown";
import {
  blankConfig, configFromDraft, parseRubricImport, syncComparisons, withScaleTable, type RubricDraft, type Row,
} from "@/lib/task-wizard/rubric";
import {
  NumberField, OptionsEditor, RowsEditor, Section, SelectField, TextAreaField, TextField, Toggle, type Errors,
} from "./fields";
import { liveForm, type WizardState } from "./state";

function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Question wording (label + help) behind a disclosure, for the less-edited questions. */
function Wording({ idBase, row, onChange, errors, errorPrefix, title }: {
  idBase: string; row: Row; onChange: (r: Row) => void; errors: Errors; errorPrefix: string; title: string;
}) {
  const hasError = Boolean(errors[`${errorPrefix}.label`] || errors[`${errorPrefix}.help`]);
  return (
    <details className="group rounded-lg border border-border/70 bg-muted/10" open={hasError || undefined}>
      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
        <PencilLine className="h-3.5 w-3.5" /> {title}: “{row.label}”
      </summary>
      <div className="px-3 pb-3 space-y-2">
        <TextField id={`${idBase}-label`} label="Question" value={row.label} error={errors[`${errorPrefix}.label`]} onChange={(v) => onChange({ ...row, label: v })} />
        <TextAreaField id={`${idBase}-help`} label="Help text" rows={2} value={row.help} error={errors[`${errorPrefix}.help`]} onChange={(v) => onChange({ ...row, help: v })} />
      </div>
    </details>
  );
}

export function StepRubric({
  state, setState, errors, locked,
}: {
  state: WizardState;
  setState: (fn: (s: WizardState) => WizardState) => void;
  errors: Errors;
  locked: boolean;
}) {
  const r = state.rubric;
  const set = (patch: Partial<RubricDraft>) => setState((s) => ({ ...s, rubric: { ...s.rubric, ...patch } }));
  const e = (k: string) => errors[`rubric.${k}`];
  const [showMd, setShowMd] = React.useState(false);

  if (state.template === "single") return <SinglePage state={state} setState={setState} errors={errors} />;

  return (
    <div className="space-y-5">
      {locked && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          Rows, options and toggles are locked because this task has submissions. Reword anything you like.
        </p>
      )}

      <Section id="rubric-dimensions" title="A. Rating dimensions" description="Each dimension is rated 1–5 for Response A and again for Response B. Say what a 1 and a 5 look like.">
        <TextField id="group-ratings" label="Group heading" value={r.groups.ratings} error={e("groups.ratings")} onChange={(v) => set({ groups: { ...r.groups, ratings: v } })} />
        <RowsEditor
          idBase="dim" rows={r.dimensions} errors={errors} errorPrefix="rubric.dimensions" min={3} max={25} locked={locked}
          nameLabel="Dimension" helpLabel="Help text: what a 1 and a 5 mean" helpPlaceholder="1 = … ; 5 = …"
          addLabel="Add dimension" newIdPrefix="dimension"
          onChange={(dimensions) => set({ dimensions, comparisons: syncComparisons(dimensions, r.comparisons) })}
        />
        <SelectField
          id="safety-dimension" label="Dimension checked against the safety override" value={r.safetyDimensionId}
          disabled={locked}
          help="If an evaluator flags a serious safety issue but rates this dimension 4 or 5, they see a warning before submitting."
          onChange={(v) => set({ safetyDimensionId: v })}
          options={[{ value: "", label: "None" }, ...r.dimensions.map((d) => ({ value: d.id, label: d.label || d.id }))]}
        />
      </Section>

      <Section id="rubric-classification" title="B. Error and safety classification">
        <OptionsEditor
          idBase="err" legend="Error categories" options={r.errorCategories.options} errors={errors}
          errorPrefix="rubric.errorCategories.options" fixedFirst fixedLast min={3} locked={locked}
          help="The first (no error) and last (Other) are fixed."
          onChange={(options) => set({ errorCategories: { ...r.errorCategories, options } })}
        />
        <Wording idBase="err-q" title="Question wording" row={r.errorCategories} errors={errors} errorPrefix="rubric.errorCategories"
          onChange={(row) => set({ errorCategories: { ...r.errorCategories, ...row } })} />

        <div className="border-t border-border/60 pt-4 space-y-3">
          <Toggle
            id="severity-enabled" checked={r.severity.enabled} disabled={locked}
            label="Ask about harm and severity"
            help="Turn off for domains where harm does not apply (for example, writing quality)."
            onChange={(enabled) => set({ severity: { ...r.severity, enabled } })}
          />
          {r.severity.enabled && (
            <>
              <OptionsEditor
                idBase="sev" legend="Harm or severity levels" options={r.severity.question.options} errors={errors}
                errorPrefix="rubric.severity.question.options" fixedFirst min={2} locked={locked}
                help='The first level means "no harm" and is fixed.'
                onChange={(options) => set({ severity: { ...r.severity, question: { ...r.severity.question, options } } })}
              />
              <Wording idBase="sev-q" title="Severity question" row={r.severity.question} errors={errors} errorPrefix="rubric.severity.question"
                onChange={(row) => set({ severity: { ...r.severity, question: { ...r.severity.question, ...row } } })} />
              <Wording idBase="harm-q" title="Yes/no harm question" row={r.severity.harm} errors={errors} errorPrefix="rubric.severity.harm"
                onChange={(row) => set({ severity: { ...r.severity, harm: row } })} />
            </>
          )}
        </div>

        <div className="border-t border-border/60 pt-4 space-y-3">
          <OptionsEditor
            idBase="ext" legend="Error extent levels" options={r.extent.options} errors={errors}
            errorPrefix="rubric.extent.options" fixedFirst min={2} locked={locked}
            help='How much of the response is affected. The first level means "no errors" and is fixed.'
            onChange={(options) => set({ extent: { ...r.extent, options } })}
          />
          <Wording idBase="ext-q" title="Question wording" row={r.extent} errors={errors} errorPrefix="rubric.extent"
            onChange={(row) => set({ extent: { ...r.extent, ...row } })} />
        </div>
      </Section>

      <Section id="rubric-written" title="C. Written prompts" description="Free-text questions asked about each response.">
        <RowsEditor
          idBase="written" rows={r.written} errors={errors} errorPrefix="rubric.written" min={1} max={12} locked={locked}
          nameLabel="Prompt" helpLabel="Help text" addLabel="Add written prompt" newIdPrefix="prompt"
          onChange={(written) => set({ written })}
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberField id="text-min" label="Minimum length (characters)" inputMode="numeric" disabled={locked}
            value={r.text.minLength} error={e("text.minLength")}
            onChange={(v) => set({ text: { ...r.text, minLength: v ?? NaN } })} />
          <NumberField id="text-max" label="Maximum length (characters)" inputMode="numeric" disabled={locked}
            value={r.text.maxLength} error={e("text.maxLength")}
            onChange={(v) => set({ text: { ...r.text, maxLength: v ?? NaN } })} />
        </div>
      </Section>

      <Section id="rubric-comparison" title="D. Part 3 comparison" description="One A / B / Tie question per rating dimension, generated for you. Switch off any you don't want compared head to head.">
        <ul className="divide-y divide-border/60 rounded-xl border border-border">
          {r.comparisons.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 min-w-0">
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground truncate">Comparison — {c.label || "(unnamed)"}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{c.help}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={c.enabled}
                aria-label={`Compare ${c.label || "this dimension"} head to head`}
                disabled={locked}
                onClick={() => set({ comparisons: r.comparisons.map((x, j) => (j === i ? { ...x, enabled: !x.enabled } : x)) })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:opacity-50 ${c.enabled ? "bg-primary border-primary" : "bg-muted border-border"}`}
              >
                <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${c.enabled ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
            </li>
          ))}
        </ul>
        {e("comparisons") && <p role="alert" className="text-[11px] font-semibold text-destructive">{e("comparisons")}</p>}
        <p className="text-[11px] text-muted-foreground">
          Part 3 also asks for the preferred response, a confidence rating, a safety override, and these four written answers:
        </p>
        <RowsEditor
          idBase="cw" rows={r.comparisonWritten} errors={errors} errorPrefix="rubric.comparisonWritten" min={4} max={4} locked
          lockedNote="Part 3 always has these four answers; reword them freely."
          nameLabel="Answer" helpLabel="Help text" addLabel="" newIdPrefix="answer"
          onChange={(comparisonWritten) => set({ comparisonWritten })}
        />
      </Section>

      <Section id="rubric-scale" title="Rating scale" description="The 1–5 labels shown under every rating, and what each level means.">
        <ol className="space-y-2">
          {[4, 3, 2, 1, 0].map((i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_12rem_1fr] gap-2 items-start">
              <span className="h-10 flex items-center justify-center rounded-lg bg-muted font-mono font-bold text-sm" aria-hidden>{i + 1}</span>
              <TextField id={`scale-label-${i}`} label={<span className="sr-only">Label for score {i + 1}</span>} value={r.scale.labels[i]}
                error={e(`scale.labels.${i}`)}
                onChange={(v) => set({ scale: { ...r.scale, labels: r.scale.labels.map((x, j) => (j === i ? v : x)) } })} />
              <TextField id={`scale-meaning-${i}`} label={<span className="sr-only">Meaning of score {i + 1}</span>} value={r.scale.meanings[i]}
                className="col-span-2 sm:col-span-1" placeholder="What this level means"
                onChange={(v) => set({ scale: { ...r.scale, meanings: r.scale.meanings.map((x, j) => (j === i ? v : x)) } })} />
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, instructions: withScaleTable(s.instructions, s.rubric.scale) }))}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Put this scale in the instructions
        </button>
      </Section>

      <InstructionsBox state={state} setState={setState} showMd={showMd} setShowMd={setShowMd} />

      <ImportExport state={state} setState={setState} locked={locked} />

      <Advanced state={state} />
    </div>
  );
}

function InstructionsBox({ state, setState, showMd, setShowMd }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void; showMd: boolean; setShowMd: (v: boolean) => void;
}) {
  return (
    <Section id="rubric-instructions" title="Instructions" description="Markdown shown in “Task Guidelines & Instructions” on the work screen. The rating scale is filled in for you.">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowMd(!showMd)} aria-pressed={showMd}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
          <Eye className="h-3.5 w-3.5" /> {showMd ? "Edit" : "Preview"}
        </button>
      </div>
      {showMd ? (
        <div className="rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground min-h-40 overflow-x-auto">
          <SimpleMarkdown text={state.instructions || "_No instructions yet._"} />
        </div>
      ) : (
        <TextAreaField id="instructions" label="Instructions (markdown)" rows={12} value={state.instructions}
          inputClassName="font-mono text-xs" onChange={(v) => setState((s) => ({ ...s, instructions: v }))} />
      )}
    </Section>
  );
}

function ImportExport({ state, setState, locked }: { state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void; locked: boolean }) {
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState<{ ok: boolean; errors: { path: string; message: string }[] } | null>(null);

  function runImport(source: string) {
    const res = parseRubricImport(source);
    if (!res.ok) {
      setResult({ ok: false, errors: res.errors });
      return;
    }
    if (!confirm("Replace the rubric, instructions and timing with the imported config?")) return;
    setState((s) => ({
      ...s,
      rubric: res.draft,
      instructions: res.instructions || s.instructions,
      timing: { claim_minutes: res.timing.claim_minutes, max_credited_minutes: Math.round(res.timing.max_credited_seconds_per_item / 60) },
    }));
    setResult({ ok: true, errors: [] });
  }

  return (
    <Section id="rubric-import" title="Import rubric" description="Paste or upload a JSON config file. Word documents are not supported; copy the wording into the rows above instead.">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => download("rubric-config-blank.json", JSON.stringify(blankConfig(), null, 2))}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
          <Download className="h-3.5 w-3.5" /> Download blank config
        </button>
        <button type="button"
          onClick={() => download(`rubric-config-${state.basics.slug || "task"}.json`, JSON.stringify(configFromDraft(state.rubric, state.instructions, {
            claim_minutes: state.timing.claim_minutes ?? 90, max_credited_seconds_per_item: (state.timing.max_credited_minutes ?? 60) * 60,
          }), null, 2))}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
          <Download className="h-3.5 w-3.5" /> Download this rubric
        </button>
      </div>
      {locked ? (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Lock className="h-3 w-3" /> Import is off while the form is locked.</p>
      ) : (
        <>
          <TextAreaField id="import-text" label="Paste config JSON" rows={4} value={text} onChange={setText}
            inputClassName="font-mono text-xs" placeholder='{ "dimensions": [ … ], … }' />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!text.trim()} onClick={() => runImport(text)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
              Validate and import
            </button>
            <label className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 cursor-pointer focus-within:ring-3 focus-within:ring-primary/30">
              <FileUp className="h-3.5 w-3.5" /> Upload .json
              <input type="file" accept=".json,application/json" className="sr-only"
                onChange={async (ev) => {
                  const f = ev.target.files?.[0];
                  ev.target.value = "";
                  if (!f) return;
                  if (/\.docx?$/i.test(f.name)) {
                    setResult({ ok: false, errors: [{ path: "(file)", message: "Word files are not supported. Upload a .json config." }] });
                    return;
                  }
                  const t = await f.text();
                  setText(t);
                  runImport(t);
                }} />
            </label>
          </div>
          {result && (result.ok ? (
            <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-primary"><CheckCircle2 className="h-4 w-4" /> Imported. Review the rows above.</p>
          ) : (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-destructive flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Nothing was imported. Fix these and try again:</p>
              <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                {result.errors.map((er, i) => (
                  <li key={i}><code className="font-mono text-[11px] text-foreground">{er.path}</code>: {er.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </Section>
  );
}

function Advanced({ state }: { state: WizardState }) {
  const form = React.useMemo(() => liveForm(state), [state]);
  return (
    <details className="group rounded-[14px] border border-border bg-card">
      <summary className="cursor-pointer list-none px-4 sm:px-6 py-4 font-heading text-sm font-bold text-foreground rounded-[14px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
        Advanced: generated form JSON
      </summary>
      <div className="px-4 sm:px-6 pb-5 space-y-3">
        <p className="text-[11px] text-muted-foreground">Read-only. Built from the rows above exactly as the server will build it.</p>
        {form.problems.length > 0 && <p role="alert" className="text-[11px] text-destructive font-semibold">{form.problems.join(" ")}</p>}
        <TextAreaField id="adv-schema" label={`item_schema (${form.fields.length} fields)`} rows={10} readOnly value={JSON.stringify(form.fields, null, 2)} onChange={() => {}} inputClassName="font-mono text-[11px]" />
        <TextAreaField id="adv-parts" label={`item_parts (${form.parts.length} steps)`} rows={6} readOnly value={JSON.stringify(form.parts, null, 2)} onChange={() => {}} inputClassName="font-mono text-[11px]" />
      </div>
    </details>
  );
}

function SinglePage({ state, setState, errors }: { state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void; errors: Errors }) {
  const form = React.useMemo(() => liveForm(state), [state]);
  const [showMd, setShowMd] = React.useState(false);
  return (
    <div className="space-y-5">
      <Section id="single-form" title="Single-page form" description="Single-page forms are defined as JSON. Field types: rating, select, multiselect, boolean, text.">
        <details className="group rounded-xl border border-border" open>
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">Advanced: item_schema and item_parts</summary>
          <div className="px-4 pb-4 space-y-3">
            <TextAreaField id="single-schema" label="item_schema" rows={14} value={state.single.schemaText} inputClassName="font-mono text-xs"
              error={errors["single.item_schema"]}
              onChange={(v) => setState((s) => ({ ...s, single: { ...s.single, schemaText: v } }))} />
            <TextAreaField id="single-parts" label="item_parts (optional steps; [] = one page)" rows={4} value={state.single.partsText} inputClassName="font-mono text-xs"
              onChange={(v) => setState((s) => ({ ...s, single: { ...s.single, partsText: v } }))} />
            {form.problems.length ? (
              <ul role="alert" className="text-[11px] text-destructive font-semibold space-y-0.5">{form.problems.map((p) => <li key={p}>{p}</li>)}</ul>
            ) : (
              <p className="text-[11px] text-primary font-semibold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Valid form: {form.fields.length} fields</p>
            )}
          </div>
        </details>
      </Section>
      <InstructionsBox state={state} setState={setState} showMd={showMd} setShowMd={setShowMd} />
    </div>
  );
}
