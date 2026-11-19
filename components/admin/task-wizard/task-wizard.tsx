"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, Copy, Eye, Info, Layers, Loader2, Lock, RotateCcw, Save, Send,
} from "lucide-react";
import type { Task, WorkItem } from "@/lib/supabase/types";
import type { Field, Part } from "@/lib/item-schema";
import { configFromTask } from "@/lib/rubrics";
import { draftFromConfig, type FieldErrors } from "@/lib/task-wizard/rubric";
import { saveTaskWizard, duplicateTaskVersion } from "@/actions/task-wizard";
import { toast } from "@/components/ui/toast";
import { WorkInterface } from "@/components/work/work-interface";
import { StepBasics, type TaskSource } from "./step-basics";
import { StepRubric } from "./step-rubric";
import { StepTiming } from "./step-timing";
import { StepItems } from "./step-items";
import {
  STEPS, STARTER_SINGLE, liveForm, newState, stateFromTask, stepOfError, toInput, validateStep,
  type BasicsState, type Template, type WizardState,
} from "./state";

export type SourceTask = {
  id: string; title: string; slug: string; item_schema: unknown; item_parts: unknown;
  instructions: string | null; claim_minutes: number | null; max_credited_seconds_per_item: number | null;
};

type Props = {
  task?: Task;
  submissionCount?: number;
  sources: SourceTask[];
};

type Saved = { version: 1; savedAt: string; baseUpdatedAt: string | null; step: number; state: WizardState };

const storageKey = (task?: Task) => `revive:task-wizard:${task?.id ?? "new"}`;

function readAutosave(task?: Task): Saved | null {
  try {
    const raw = localStorage.getItem(storageKey(task));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (saved.version !== 1 || !saved.state?.basics || !saved.state?.rubric) return null;
    // A task changed elsewhere since this draft was written: don't resurrect stale edits.
    if (task && saved.baseUpdatedAt !== (task.updated_at ?? null)) return null;
    return saved;
  } catch {
    return null;
  }
}

export function TaskWizard({ task, submissionCount = 0, sources }: Props) {
  const router = useRouter();
  const isEdit = Boolean(task);
  const locked = isEdit && submissionCount > 0;

  // Rendered client-only (see task-wizard-loader), so localStorage can seed the first render.
  const [restored] = React.useState(() => readAutosave(task));
  const [state, setStateRaw] = React.useState<WizardState>(() => restored?.state ?? (task ? stateFromTask(task) : newState()));
  const [step, setStep] = React.useState(() => restored?.step ?? 0);
  const [showRestored, setShowRestored] = React.useState(Boolean(restored));
  // Steps the admin tried to leave (or save) are re-checked live, so a fixed field clears at once.
  const [checked, setChecked] = React.useState<Set<number>>(() => new Set());
  // Errors from the last save; cleared on the next edit.
  const [serverErrors, setServerErrors] = React.useState<FieldErrors>({});
  const [problems, setProblems] = React.useState<string[]>([]);
  const [rowErrors, setRowErrors] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState<null | "draft" | "open" | "keep">(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const setState = React.useCallback((fn: (s: WizardState) => WizardState) => {
    setStateRaw(fn);
    setServerErrors({});
  }, []);

  const errors = React.useMemo(() => {
    const live: FieldErrors = {};
    for (const i of checked) Object.assign(live, validateStep(state, i));
    return { ...serverErrors, ...live };
  }, [checked, state, serverErrors]);

  // Autosave (debounced) so a refresh never loses work.
  React.useEffect(() => {
    const t = setTimeout(() => {
      const saved: Saved = { version: 1, savedAt: new Date().toISOString(), baseUpdatedAt: task?.updated_at ?? null, step, state };
      try {
        localStorage.setItem(storageKey(task), JSON.stringify(saved));
      } catch {
        // Quota: keep everything but the CSV text, which is the only large part.
        try {
          localStorage.setItem(storageKey(task), JSON.stringify({ ...saved, state: { ...state, items: { ...state.items, csvText: "", csv: null } } }));
        } catch {
          /* storage unavailable */
        }
      }
    }, 600);
    return () => clearTimeout(t);
  }, [state, step, task]);

  const form = React.useMemo(() => liveForm(state), [state]);
  const itemCount = (state.items.csv?.valid ? state.items.csv.total : 0) + state.items.manual.length;

  function go(to: number) {
    setStep(to);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function next() {
    const errs = validateStep(state, step);
    setChecked((prev) => new Set(prev).add(step));
    if (Object.keys(errs).length) {
      toast.error("Please fix the highlighted fields.");
      requestAnimationFrame(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }
    go(Math.min(step + 1, STEPS.length - 1));
  }

  function setBasics(patch: Partial<BasicsState>) {
    setState((s) => ({ ...s, basics: { ...s.basics, ...patch } }));
  }


  function chooseTemplate(t: Template) {
    if (t === state.template || locked) return;
    if (!confirm(t === "pairwise" ? "Switch to the pairwise template? The default rubric will be loaded." : "Switch to a single-page form? The rubric rows are kept in case you switch back.")) return;
    setState((s) => ({
      ...s,
      template: t,
      ...(t === "pairwise" ? { rubric: newState().rubric } : { single: { schemaText: JSON.stringify(STARTER_SINGLE, null, 2), partsText: "[]" } }),
    }));
  }

  function copyFrom(id: string) {
    const src = sources.find((s) => s.id === id);
    if (!src) return;
    if (!confirm(`Copy the rubric, instructions and timing from “${src.title}”? This replaces what you have in steps 2 and 3.`)) return;
    const config = configFromTask(src.item_schema, src.instructions, src);
    setState((s) => ({
      ...s,
      template: config ? "pairwise" : "single",
      rubric: config ? draftFromConfig(config) : s.rubric,
      single: config ? s.single : {
        schemaText: JSON.stringify(Array.isArray(src.item_schema) ? src.item_schema : [], null, 2),
        partsText: JSON.stringify(Array.isArray(src.item_parts) ? src.item_parts : [], null, 2),
      },
      instructions: src.instructions ?? s.instructions,
      timing: {
        claim_minutes: src.claim_minutes ?? s.timing.claim_minutes,
        max_credited_minutes: src.max_credited_seconds_per_item ? Math.round(src.max_credited_seconds_per_item / 60) : s.timing.max_credited_minutes,
      },
    }));
    toast.success(`Copied from “${src.title}”.`);
  }

  async function save(intent: "draft" | "open" | "keep") {
    // Check every step first, the same way the server will.
    const all: FieldErrors = {};
    STEPS.forEach((_, i) => Object.assign(all, validateStep(state, i)));
    setChecked(new Set(STEPS.map((_, i) => i)));
    setServerErrors({});
    setProblems([]);
    setRowErrors([]);
    if (Object.keys(all).length) {
      const first = Math.min(...Object.keys(all).map(stepOfError));
      toast.error("Some fields need attention.", { description: `See step ${first + 1}: ${STEPS[first].title}.` });
      go(first);
      return;
    }
    setSaving(intent);
    const res = await saveTaskWizard(toInput(state, intent, task?.id));
    setSaving(null);
    if (!res.ok) {
      const fe = "fieldErrors" in res && res.fieldErrors ? res.fieldErrors : {};
      setServerErrors(fe);
      setProblems("problems" in res && res.problems ? res.problems : []);
      setRowErrors("rowErrors" in res && res.rowErrors ? res.rowErrors : []);
      toast.error(res.error);
      const keys = Object.keys(fe);
      if (keys.length) go(Math.min(...keys.map(stepOfError)));
      else if ("rowErrors" in res && res.rowErrors?.length) go(3);
      return;
    }
    try {
      localStorage.removeItem(storageKey(task));
    } catch {
      /* ignore */
    }
    for (const w of res.warnings) toast.info(w);
    toast.success(
      res.status === "open" ? "Saved and open for applications." : isEdit ? "Changes saved." : "Saved as a draft task.",
      res.batch ? { description: `${res.batch.added} case${res.batch.added === 1 ? "" : "s"} added to the draft batch “${res.batch.name}”. Publish it from Items when ready.` } : undefined
    );
    router.push(res.batch ? `/admin/tasks/${res.taskId}/items` : "/admin/tasks");
    router.refresh();
  }

  async function duplicate() {
    if (!task || !confirm("Create a new draft copy of this task? You can change its form freely; the original and its submissions stay as they are.")) return;
    setDuplicating(true);
    const res = await duplicateTaskVersion(task.id);
    setDuplicating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Created “${res.slug}” as a draft.`);
    router.push(`/admin/tasks/${res.taskId}/edit`);
  }

  function discardRestore() {
    try {
      localStorage.removeItem(storageKey(task));
    } catch {
      /* ignore */
    }
    setStateRaw(task ? stateFromTask(task) : newState());
    setStep(0);
    setShowRestored(false);
    setChecked(new Set());
    setServerErrors({});
  }

  function openPreview() {
    if (form.problems.length || form.fields.length === 0) {
      toast.error("The form isn't complete yet.", { description: form.problems[0] ?? "Add some fields first." });
      return;
    }
    setPreviewing(true);
  }

  return (
    <div className="space-y-5">
      {showRestored && restored && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
          <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary shrink-0" />
            Restored your unsaved changes from {new Date(restored.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setShowRestored(false)} className="h-9 px-3 rounded-full border border-border font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">Keep</button>
            <button type="button" onClick={discardRestore} className="h-9 px-3 rounded-full border border-border font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">Discard and start over</button>
          </span>
        </div>
      )}

      {locked && (
        <div role="note" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-100">
          <span className="flex items-start gap-2.5">
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong className="block text-sm">This task has {submissionCount} submission{submissionCount === 1 ? "" : "s"}.</strong>
              Their answers are stored under the current field ids and options, so you can only change wording and timing here.
              For anything bigger, duplicate it as a new version.
            </span>
          </span>
          <button type="button" onClick={duplicate} disabled={duplicating}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-foreground text-background text-xs font-semibold shrink-0 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
            {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Duplicate as new version
          </button>
        </div>
      )}

      {/* Stepper */}
      <nav aria-label="Task setup steps" className="bg-card rounded-[14px] border border-border p-2 shadow-2xs">
        <ol className="grid grid-cols-4 gap-1">
          {STEPS.map((s, i) => {
            const current = i === step;
            const hasErr = Object.keys(errors).some((k) => stepOfError(k) === i);
            const done = i < step && !hasErr;
            return (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={current ? "step" : undefined}
                  className={`w-full flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 rounded-xl px-2 py-2 sm:px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 ${
                    current ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasErr ? "bg-destructive text-white" : current ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {hasErr ? <AlertTriangle className="h-3.5 w-3.5" aria-label="has errors" /> : done ? <Check className="h-3.5 w-3.5" aria-label="done" /> : i + 1}
                  </span>
                  <span className="min-w-0 text-center sm:text-left">
                    <span className={`block text-[11px] sm:text-xs font-bold truncate ${current ? "text-primary" : "text-foreground"}`}>{s.title}</span>
                    <span className="hidden sm:block text-[10px] text-muted-foreground">Step {i + 1} of {STEPS.length}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-5 items-start">
        <div className="min-w-0 space-y-5">
          <h2 ref={headingRef} tabIndex={-1} className="font-heading text-xl font-bold text-foreground scroll-mt-4 outline-none">
            {step + 1}. {STEPS[step].title}
            {step === 1 && state.template === "single" ? ": single-page form" : ""}
          </h2>

          {problems.length > 0 && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-destructive">The server refused to save:</p>
              <ul className="list-disc pl-5 space-y-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}

          {step === 0 && (
            <StepBasics
              state={state} setBasics={setBasics} errors={errors} locked={locked} onTemplate={chooseTemplate}
              sources={sources.filter((s) => s.id !== task?.id).map<TaskSource>((s) => ({ id: s.id, title: s.title, slug: s.slug, pairwise: Boolean(configFromTask(s.item_schema)) }))}
              onCopyFrom={copyFrom}
            />
          )}
          {step === 1 && <StepRubric state={state} setState={setState} errors={errors} locked={locked} />}
          {step === 2 && <StepTiming state={state} errors={errors} setTiming={(p) => setState((s) => ({ ...s, timing: { ...s.timing, ...p } }))} />}
          {step === 3 && <StepItems state={state} setState={setState} errors={errors} taskId={task?.id} rowErrors={rowErrors} />}

          {/* Back / Next */}
          <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-3 py-3 bg-background/95 backdrop-blur border-t border-border sm:border sm:rounded-[14px] sm:shadow-sm flex items-center justify-between gap-3">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full border border-border bg-card text-xs font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
                Next: {STEPS[step + 1].title} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <SaveButtons isEdit={isEdit} status={task?.status} saving={saving} onSave={save} compact />
            )}
          </div>
        </div>

        {/* Summary: beside the steps on desktop, after them on phones */}
        <aside aria-label="Task summary" className="lg:sticky lg:top-4 space-y-4 min-w-0">
          <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Summary</h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Template</dt><dd className="font-semibold text-right">{state.template === "pairwise" ? "Pairwise" : "Single page"}</dd>
              <dt className="text-muted-foreground">Parts</dt><dd className="font-semibold text-right font-mono">{form.parts.length || (state.template === "single" ? 1 : "—")}</dd>
              <dt className="text-muted-foreground">Fields</dt><dd className="font-semibold text-right font-mono">{form.fields.length || "—"}</dd>
              <dt className="text-muted-foreground">Claim window</dt><dd className="font-semibold text-right font-mono">{state.timing.claim_minutes ?? "—"} min</dd>
              <dt className="text-muted-foreground">Credited cap</dt><dd className="font-semibold text-right font-mono">{state.timing.max_credited_minutes ?? "—"} min</dd>
              <dt className="text-muted-foreground">New cases</dt><dd className="font-semibold text-right font-mono">{itemCount.toLocaleString()}</dd>
            </dl>
            {form.problems.length > 0 && (
              <p className="text-[11px] text-destructive font-semibold flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /> {form.problems[0]}</p>
            )}
            <button type="button" onClick={openPreview}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full border border-primary/40 text-primary text-xs font-bold hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
              <Eye className="h-3.5 w-3.5" /> Preview as contributor
            </button>
          </div>
          <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs space-y-2">
            <SaveButtons isEdit={isEdit} status={task?.status} saving={saving} onSave={save} />
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              Drafts are hidden from contributors. Your progress is kept in this browser until you save.
            </p>
          </div>
        </aside>
      </div>

      {previewing && (
        <PreviewOverlay state={state} fields={form.fields} parts={form.parts} onExit={() => setPreviewing(false)} />
      )}
    </div>
  );
}

function SaveButtons({ isEdit, status, saving, onSave, compact }: {
  isEdit: boolean; status?: string; saving: null | "draft" | "open" | "keep"; onSave: (i: "draft" | "open" | "keep") => void; compact?: boolean;
}) {
  const primary = "inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30";
  const secondary = "inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border bg-card text-xs font-semibold hover:bg-muted/50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30";
  const spin = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  const busy = saving !== null;
  const wrap = compact ? "flex items-center gap-2" : "flex flex-col gap-2";
  if (isEdit) {
    return (
      <div className={wrap}>
        <button type="button" className={primary} disabled={busy} onClick={() => onSave("keep")}>
          {saving === "keep" ? spin : <Save className="h-3.5 w-3.5" />} Save changes
        </button>
        {status !== "open" && (
          <button type="button" className={secondary} disabled={busy} onClick={() => onSave("open")}>
            {saving === "open" ? spin : <Send className="h-3.5 w-3.5" />} {compact ? "Save and open" : "Save and open for applications"}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className={wrap}>
      <button type="button" className={primary} disabled={busy} onClick={() => onSave("draft")}>
        {saving === "draft" ? spin : <Save className="h-3.5 w-3.5" />} Save as draft task
      </button>
      <button type="button" className={secondary} disabled={busy} onClick={() => onSave("open")}>
        {saving === "open" ? spin : <Send className="h-3.5 w-3.5" />} {compact ? "Save and open" : "Save and open for applications"}
      </button>
    </div>
  );
}

const PLACEHOLDER_CASE = {
  case_id: "PREVIEW-001",
  prompt: "A placeholder prompt. Upload cases in step 4 to preview with real content.",
  response_a: "A placeholder for Response A.",
  response_b: "A placeholder for Response B.",
};

/** The real work screen in preview mode, over the wizard. Nothing is saved and no clock runs. */
function PreviewOverlay({ state, fields, parts, onExit }: {
  state: WizardState; fields: Field[]; parts: Part[]; onExit: () => void;
}) {
  const closeRef = React.useRef(onExit);
  React.useEffect(() => {
    closeRef.current = onExit;
  });
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const b = state.basics;
  const first = state.items.csv?.valid ? state.items.csv.preview[0] : state.items.manual[0];
  const payload = first ?? PLACEHOLDER_CASE;
  const claimMinutes = state.timing.claim_minutes ?? 90;
  // Fixed once per preview so the countdown shows the claim window.
  const [expires] = React.useState(() => new Date(Date.now() + claimMinutes * 60_000).toISOString());

  const task = {
    id: "preview", slug: b.slug || "preview", title: b.title || "Untitled task", pay_model: b.pay_model,
    rate_cents: Math.round((b.rate ?? 0) * 100), auto_approve_hourly: b.auto_approve_hourly,
    instructions: state.instructions, item_schema: fields, item_parts: parts,
    claim_minutes: claimMinutes, max_credited_seconds_per_item: (state.timing.max_credited_minutes ?? 60) * 60,
  } as unknown as Task;
  const item = {
    id: "preview-item", task_id: "preview", status: "claimed", external_ref: payload.case_id,
    claim_expires_at: expires, payload,
  } as unknown as WorkItem;

  return (
    <div role="dialog" aria-modal="true" aria-label="Preview as contributor" className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-6 pb-28">
        <WorkInterface task={task} item={item} rateCents={task.rate_cents ?? 0} preview={{ onExit }} />
      </div>
    </div>
  );
}
