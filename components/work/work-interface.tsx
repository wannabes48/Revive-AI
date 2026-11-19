"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Task, WorkItem } from "@/lib/supabase/types";
import { type Field, type Part, buildAnswersSchema, groupRuns, partProgress, resolveParts } from "@/lib/item-schema";
import { formFlags, scaleMeanings } from "@/lib/rubrics";
import { submitWork, releaseItem, startWorking, stopWorking, confirmPresence, saveDraft } from "@/actions/work";
import { AnswerField } from "@/components/work/answer-field";
import { SimpleMarkdown } from "@/components/work/simple-markdown";
import { useWorkClock, formatClock } from "@/hooks/use-work-clock";
import { formatCents } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
} from "@/components/ui/responsive-dialog";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import {
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle2,
  LogOut,
  ArrowRight,
  Info,
  Check,
  ChevronDown,
  Square,
  Hand,
  PauseCircle,
  Lock,
  ArrowLeft,
  CloudCheck,
  CloudOff,
  Eye,
  X,
} from "lucide-react";

interface WorkInterfaceProps {
  task: Task;
  item: WorkItem;
  rateCents: number;
  /** The contributor's server-saved draft for this item, if any. */
  draft?: { answers: Record<string, unknown>; updatedAt: string } | null;
  /**
   * Admin preview: the real screen, but nothing leaves the browser. No drafts (server or local),
   * no submissions, no claim actions, and the work clock never starts.
   */
  preview?: { onExit: () => void };
}

const ALL_PART = "__all";

function cleanAnswers(fields: Field[], answers: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = answers[f.id];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    out[f.id] = v;
  }
  return out;
}

function prettyKey(key: string) {
  return key.replace(/_/g, " ");
}

export function WorkInterface({ task, item, rateCents, draft = null, preview }: WorkInterfaceProps) {
  const router = useRouter();
  const isPreview = Boolean(preview);
  const isHourly = task.pay_model === "hourly";
  const autoCredit = isHourly && task.auto_approve_hourly !== false;
  const clock = useWorkClock(item.id, !isPreview);
  const [stopping, setStopping] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // The sticky header's height, as --work-header-h. Elements carry scroll-mt with it, so the
  // stepper, the panes and any field scrolled to on focus stop below the header.
  const rootRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const stepperRef = React.useRef<HTMLElement>(null);
  const guidelinesRef = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root) return;
    const update = () => {
      root.style.setProperty("--work-header-h", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // The claim was lost (expired and re-claimed, or released by an admin).
  React.useEffect(() => {
    if (clock.paused === "lost_claim") {
      toast.error("This task is no longer assigned to you.");
      router.push(`/work/${task.slug}`);
    }
  }, [clock.paused, router, task.slug]);

  const fields: Field[] = React.useMemo(
    () => (Array.isArray(task.item_schema) ? (task.item_schema as Field[]) : []),
    [task.item_schema]
  );
  const parts: Part[] = React.useMemo(() => resolveParts(fields, task.item_parts), [fields, task.item_parts]);
  const isMultiPart = parts.length > 0;
  // Single-page forms behave as one implicit step
  const stepParts: Part[] = React.useMemo(
    () => (isMultiPart ? parts : [{ id: ALL_PART, title: "Evaluation Response" }]),
    [isMultiPart, parts]
  );
  const stepFields: Field[] = React.useMemo(
    () => (isMultiPart ? fields : fields.map((f) => ({ ...f, part: ALL_PART }))),
    [isMultiPart, fields]
  );
  const draftKey = `draft:${item.id}`;

  // Answers: server draft first, then the local backup
  const [answers, setAnswers] = React.useState<Record<string, unknown>>(() => {
    if (isPreview) return {};
    if (draft?.answers && Object.keys(draft.answers).length > 0) return draft.answers;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });
  const [savedAt, setSavedAt] = React.useState<string | null>(draft?.updatedAt ?? null);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "error">("idle");
  const dirtyRef = React.useRef(false);
  const answersRef = React.useRef(answers);
  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const persistDraft = React.useCallback(async () => {
    if (isPreview || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveState("saving");
    const res = await saveDraft(item.id, answersRef.current);
    if ("error" in res && res.error) {
      dirtyRef.current = true;
      setSaveState("error");
      return;
    }
    setSaveState("idle");
    if ("savedAt" in res && res.savedAt) setSavedAt(res.savedAt);
  }, [item.id, isPreview]);

  // Save on the server 2 seconds after the contributor stops changing answers
  React.useEffect(() => {
    if (isPreview) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      // ignore
    }
    if (!dirtyRef.current) return;
    const t = setTimeout(() => void persistDraft(), 2000);
    return () => clearTimeout(t);
  }, [answers, draftKey, persistDraft, isPreview]);

  // Steps
  const progress = React.useMemo(
    () => partProgress(stepFields, stepParts, answers),
    [stepFields, stepParts, answers]
  );
  const [currentPartId, setCurrentPartId] = React.useState<string>(() => {
    const states = partProgress(stepFields, stepParts, answers);
    return (states.find((s) => !s.complete && !s.locked) ?? states[0])?.id ?? ALL_PART;
  });
  const currentPart = stepParts.find((p) => p.id === currentPartId) ?? stepParts[0];
  const currentState = progress.find((s) => s.id === currentPart.id);
  const currentFields = stepFields.filter((f) => f.part === currentPart.id);
  const currentIndex = stepParts.findIndex((p) => p.id === currentPart.id);
  const allComplete = progress.every((s) => s.complete);

  function goToPart(id: string) {
    const state = progress.find((s) => s.id === id);
    if (!state || state.locked) return;
    void persistDraft();
    setCurrentPartId(id);
    stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const [flagsDialog, setFlagsDialog] = React.useState<string[] | null>(null);

  const ratingScale = React.useMemo(() => {
    const f = fields.find((x) => x.type === "rating" && x.scaleLabels?.length) as
      | Extract<Field, { type: "rating" }>
      | undefined;
    if (!f?.scaleLabels) return null;
    const meanings = scaleMeanings(fields, task.instructions);
    return f.scaleLabels
      .map((label, i) => ({ score: f.min + i, label, meaning: meanings[i] as string | undefined }))
      .reverse();
  }, [fields, task.instructions]);
  const scaleHasMeanings = ratingScale?.some((r) => r.meaning) ?? false;

  const [instructionsOpen, setInstructionsOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [releasing, setReleasing] = React.useState(false);
  const [successModal, setSuccessModal] = React.useState(false);
  const [claimingNext, setClaimingNext] = React.useState(false);

  // Live countdown to claim_expires_at
  const [timeLeftMs, setTimeLeftMs] = React.useState<number>(() => {
    if (!item.claim_expires_at) return 60 * 60 * 1000;
    return new Date(item.claim_expires_at).getTime() - Date.now();
  });

  React.useEffect(() => {
    if (!item.claim_expires_at) return;

    const timer = setInterval(() => {
      const remaining = new Date(item.claim_expires_at!).getTime() - Date.now();
      setTimeLeftMs(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [item.claim_expires_at]);

  const isExpired = timeLeftMs <= 0;
  const isUrgent = timeLeftMs > 0 && timeLeftMs < 5 * 60 * 1000; // under 5 minutes

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "00:00 (Expired)";
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Answer change handlers
  const handleAnswerChange = (fieldId: string, value: unknown) => {
    dirtyRef.current = true;
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Same validation the server runs at submit
  const isFormValid = React.useMemo(
    () => buildAnswersSchema(fields).safeParse(cleanAnswers(fields, answers)).success,
    [fields, answers]
  );

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isPreview) {
      toast.info("Preview only: submissions are turned off.");
      return;
    }
    if (!isFormValid) {
      toast.error(
        isMultiPart ? "Complete every step before submitting." : "Please fill in all required fields before submitting."
      );
      return;
    }
    const flags = formFlags(fields, cleanAnswers(fields, answers));
    if (flags.length > 0) {
      setFlagsDialog(flags);
      return;
    }
    await doSubmit();
  }

  async function doSubmit() {
    setFlagsDialog(null);
    if (isPreview) return;
    setSubmitting(true);
    const res = await submitWork(task.id, item.id, cleanAnswers(fields, answers));
    setSubmitting(false);

    if (res.error) {
      toast.error("Submission failed", { description: res.error });
      if (res.error.includes("no longer assigned")) {
        router.push(`/work/${task.slug}`);
      }
    } else {
      dirtyRef.current = false;
      try {
        localStorage.removeItem(draftKey);
      } catch {}

      toast.success(autoCredit ? "Work submitted. Your time has been credited." : "Work submitted for review!");
      setSuccessModal(true);
    }
  }

  // Release Item Handler
  async function handleRelease() {
    if (!confirm("Are you sure you want to release this task? It will be returned to the queue for other contributors.")) {
      return;
    }
    setReleasing(true);
    try {
      localStorage.removeItem(draftKey);
    } catch (err) {}
    await releaseItem(item.id, task.slug);
  }

  // Next Item Handler from modal
  async function handleNextItem() {
    setClaimingNext(true);
    const res = await startWorking(task.id, task.slug, isHourly);
    setClaimingNext(false);

    if (res?.empty) {
      toast.error("No tasks right now", {
        description: isHourly
          ? "The queue is empty, so your clock has been stopped. Check back soon."
          : "No tasks available right now. Check back soon.",
      });
      router.push(`/work/${task.slug}`);
    } else if (res?.error) {
      toast.error("Could not start the next task", { description: res.error });
      router.push(`/work/${task.slug}`);
    }
  }

  async function handleStop() {
    if (!confirm("Stop the work clock? The task you're holding goes back to the queue.")) return;
    setStopping(true);
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    await stopWorking(task.slug);
  }

  async function handleConfirmPresence() {
    setConfirming(true);
    const res = await confirmPresence();
    setConfirming(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    clock.resync();
  }

  const clockState: { label: string; tone: "run" | "pause" | "stop" } = isPreview
    ? { label: "Preview: the work clock is off", tone: "pause" }
    : clock.paused === null
      ? { label: "Running", tone: "run" }
      : clock.paused === "idle"
      ? { label: "Paused: idle (move or type to resume)", tone: "pause" }
      : clock.paused === "hidden"
      ? { label: "Paused: tab hidden", tone: "pause" }
      : clock.paused === "needs_presence"
      ? { label: "Paused: still working?", tone: "pause" }
      : clock.paused === "daily_cap"
      ? { label: "Daily limit reached", tone: "stop" }
      : { label: "Clock unavailable", tone: "stop" };

  return (
    <div
      ref={rootRef}
      className="min-w-0 [--work-header-h:9rem] [&_:is(input,select,textarea,[role=radio])]:scroll-mt-[calc(var(--work-header-h)+1rem)]"
    >
      {/* Sticky header. Only this wrapper is sticky; its solid background hides what scrolls under it. */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-background pb-3">
        <div className="bg-card border border-border rounded-[14px] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 pt-3.5 pb-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {!isPreview && (
                <>
                  <Link
                    href={`/work/${task.slug}`}
                    aria-label="Task Home"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    ←<span className="hidden sm:inline"> Task Home</span>
                  </Link>
                  <span className="text-muted-foreground/40 shrink-0">•</span>
                </>
              )}
              <h2 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                {task.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setInstructionsOpen(true);
                  guidelinesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-controls="task-guidelines-panel"
                className="rounded-full text-xs font-semibold gap-1.5 h-8 px-3"
              >
                <Info className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Instructions</span>
              </Button>

              {isPreview && (
                <Button
                  type="button"
                  size="sm"
                  onClick={preview!.onExit}
                  className="rounded-full text-xs font-semibold h-8 px-3 gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Exit preview</span>
                </Button>
              )}

              {isHourly && !isPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={stopping || submitting}
                  onClick={handleStop}
                  className="rounded-full text-xs font-semibold h-8 px-3 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  {stopping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3 fill-current" />}
                  <span>Stop</span>
                </Button>
              )}

              {!isPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={releasing || submitting}
                onClick={handleRelease}
                className="rounded-full text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-3 gap-1.5"
              >
                {releasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                <span className="hidden sm:inline">Release</span>
              </Button>
              )}
            </div>
          </div>

          {/* Status chips: two per row on phones (two lines), natural width from sm up */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-border/60 [&>span]:min-w-0 [&>span]:basis-[calc(50%-0.25rem)] [&>span]:justify-center sm:[&>span]:basis-auto sm:[&>span]:justify-start">
            {/* Compensation */}
            <span
              title={isHourly ? `${formatCents(rateCents)} per completed hour` : `${formatCents(rateCents)} on approval`}
              className="inline-flex items-center h-7 text-[11px] sm:text-xs font-mono font-bold px-2.5 sm:px-3 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20 whitespace-nowrap"
            >
              <span className="truncate">
                {isHourly ? (
                  <>
                    {formatCents(rateCents)} /<span className="sm:hidden"> hr</span>
                    <span className="hidden sm:inline"> completed hour</span>
                  </>
                ) : (
                  `${formatCents(rateCents)} on approval`
                )}
              </span>
            </span>

            {/* Server work clock */}
            <span
              title={
                isHourly
                  ? `${clockState.label}. Today ${formatClock(clock.sessionSeconds)}, this task ${formatClock(clock.itemSeconds)}`
                  : clockState.label
              }
              className={`inline-flex items-center gap-2 h-7 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-mono font-bold border whitespace-nowrap ${
                clockState.tone === "run"
                  ? "bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/25"
                  : clockState.tone === "pause"
                  ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  clockState.tone === "run"
                    ? "bg-[#0F766E] animate-pulse"
                    : clockState.tone === "pause"
                    ? "bg-amber-500"
                    : "bg-destructive"
                }`}
              />
              {isPreview ? (
                <span className="truncate">Clock off</span>
              ) : isHourly ? (
                <span className="truncate">
                  <span className="hidden sm:inline">Today </span>
                  {formatClock(clock.sessionSeconds)} ·<span className="hidden sm:inline"> Task</span>{" "}
                  {formatClock(clock.itemSeconds)}
                </span>
              ) : (
                <span className="truncate">Time {formatClock(clock.itemSeconds)}</span>
              )}
            </span>

            {/* Claim hold countdown */}
            <span
              title="Time left before this task returns to the queue"
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-mono font-bold border whitespace-nowrap transition-colors ${
                isExpired
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : isUrgent
                  ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] animate-pulse"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Hold {formatCountdown(timeLeftMs)}</span>
            </span>

            {/* Draft status */}
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                saveState === "error"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-muted/40 text-muted-foreground border-border"
              }`}
            >
              {isPreview ? (
                <Eye className="h-3 w-3 shrink-0" />
              ) : saveState === "saving" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : saveState === "error" ? (
                <CloudOff className="h-3 w-3" />
              ) : (
                <CloudCheck className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {isPreview
                  ? "Preview: nothing is saved"
                  : saveState === "saving"
                  ? "Saving…"
                  : saveState === "error"
                  ? "Not saved, retrying"
                  : savedAt
                  ? `Saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Draft not saved yet"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Clock pause banner */}
      {isPreview && (
        <div className="mb-3 flex items-center gap-2.5 p-3 rounded-xl text-xs border bg-primary/5 border-primary/20 text-foreground">
          <Eye className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Preview as contributor. Answers stay in this window: no drafts or submissions are saved and the work
            clock does not run.
          </span>
        </div>
      )}

      {!isPreview && clockState.tone !== "run" && clock.paused !== "needs_presence" && clock.paused !== "lost_claim" && (
        <div
          className={`mb-3 flex items-center gap-2.5 p-3 rounded-xl text-xs border ${
            clockState.tone === "pause"
              ? "bg-[#FEF3C7] border-[#FDE68A] text-[#78350F]"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <PauseCircle className="h-4 w-4 shrink-0" />
          <span>
            {clock.paused === "idle"
              ? "The clock is paused because there has been no activity for 3 minutes. Move the mouse or type to resume."
              : clock.paused === "hidden"
              ? "The clock is paused while this tab is hidden."
              : clock.paused === "daily_cap"
              ? "You have reached the 10-hour daily limit. Submit this task or stop for today; no more time will be counted."
              : "We could not reach the work clock. Check your connection; time is not counted until it reconnects."}
          </span>
        </div>
      )}

      {/* Expired Warning Banner */}
      {isExpired && !isPreview && (
        <div className="mb-3 flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Your claim timer has expired. Your submission will still be accepted unless another contributor claims this task first.
          </span>
        </div>
      )}

      {/* Task guidelines: in normal flow below the sticky header, never overlapping it */}
      <section
        ref={guidelinesRef}
        aria-label="Task guidelines"
        className="relative z-0 mt-0 scroll-mt-[var(--work-header-h)] bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setInstructionsOpen(!instructionsOpen)}
          aria-expanded={instructionsOpen}
          aria-controls="task-guidelines-panel"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left min-h-[44px] hover:bg-muted/30 transition-colors"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate font-heading text-sm font-bold text-foreground">
              Task Guidelines & Instructions
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary">
            {instructionsOpen ? "Collapse" : "Expand"}
            <ChevronDown
              aria-hidden
              className={`h-4 w-4 transition-transform duration-200 ${instructionsOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        <div
          id="task-guidelines-panel"
          role="region"
          aria-label="Task guidelines and instructions"
          inert={!instructionsOpen}
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            instructionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="p-4 pt-3 border-t border-border/60 text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans bg-muted/10">
              <SimpleMarkdown
                text={task.instructions || task.description || "Follow benchmark guidelines carefully. Evaluate each field accurately."}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stepper (multi-part forms): starts 16px below the guidelines */}
      {isMultiPart && (
        <nav
          ref={stepperRef}
          id="form-steps"
          aria-label="Form steps"
          className="mt-4 scroll-mt-[var(--work-header-h)] grid grid-cols-2 lg:grid-cols-4 gap-2"
        >
          {stepParts.map((p, i) => {
            const st = progress.find((x) => x.id === p.id)!;
            const active = p.id === currentPart.id;
            const reason = (p.requires ?? [])
              .map((r) => stepParts.findIndex((x) => x.id === r) + 1)
              .filter((n) => n > 0);
            return (
              <button
                key={p.id}
                type="button"
                disabled={st.locked}
                onClick={() => goToPart(p.id)}
                aria-current={active ? "step" : undefined}
                className={`text-left p-3 rounded-xl border transition-colors min-w-0 ${
                  active
                    ? "border-primary bg-primary/5 shadow-2xs"
                    : st.locked
                    ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      st.complete
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {st.complete ? <Check className="h-3 w-3" /> : st.locked ? <Lock className="h-2.5 w-2.5" /> : i + 1}
                  </span>
                  <span className="text-[11px] font-bold text-foreground truncate">{stepShortTitle(p, i)}</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${st.total ? Math.round((st.answered / st.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="block mt-1 text-[10px] text-muted-foreground">
                  {st.locked
                    ? `Finish step${reason.length > 1 ? "s" : ""} ${reason.join(" and ")} first`
                    : `${st.answered} of ${st.total} answered`}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* 2-Column Split: the case for this step, and the form */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
        {/* Left Column: The case (stacked first on mobile, sticky below the header on desktop) */}
        <div className="lg:col-span-6 bg-card rounded-[14px] border border-border p-4 sm:p-6 shadow-2xs space-y-4 scroll-mt-[var(--work-header-h)] lg:sticky lg:top-[calc(var(--work-header-h)+0.25rem)] max-h-[calc(100dvh-var(--work-header-h)-1.5rem)] overflow-y-auto min-w-0 max-w-full">
          <CasePane item={item} part={currentPart} parts={stepParts} isMultiPart={isMultiPart} />
        </div>

        {/* Right Column: The form for the current step */}
        <div className="lg:col-span-6 bg-card rounded-[14px] border border-border p-4 sm:p-6 shadow-2xs space-y-5 min-w-0 scroll-mt-[var(--work-header-h)]">
          <div className="pb-3 border-b border-border/60 space-y-1">
            {isMultiPart && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Step {currentIndex + 1} of {stepParts.length}
              </span>
            )}
            <h3 className="font-heading font-bold text-base text-foreground">{currentPart.title}</h3>
            <p className="text-xs text-muted-foreground">
              {currentPart.intro || "Your draft saves automatically. Answer all required fields to submit."}
            </p>
          </div>

          {ratingScale && currentFields.some((f) => f.type === "rating") && (
            <details className="group rounded-xl border border-border bg-muted/20 text-xs">
              <summary className="flex items-center justify-between p-3 font-semibold text-foreground cursor-pointer list-none">
                <span>Rating scale</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-3 pb-3 overflow-x-auto">
                <table className="w-full text-left">
                  <tbody>
                    {ratingScale.map((r) => (
                      <tr key={r.score} className="border-t border-border/50 align-top">
                        <td className="py-1.5 pr-2 font-bold font-mono">{r.score}</td>
                        <td className="py-1.5 pr-3 font-semibold text-foreground whitespace-nowrap">{r.label}</td>
                        {scaleHasMeanings && <td className="py-1.5 text-muted-foreground">{r.meaning}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Use the full 1–5 scale. Judge the criterion itself, not response length, confidence, formatting,
                  or writing style alone.
                </p>
              </div>
            </details>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {groupRuns(currentFields).map((run, ri) => (
              <section key={`${run.group ?? "fields"}-${ri}`} className="space-y-5">
                {run.group && (
                  <h4 className="font-heading text-sm font-bold text-foreground pt-2 border-t border-border/60 first:border-0 first:pt-0">
                    {run.group}
                  </h4>
                )}
                {run.fields.map((field) => (
                  <AnswerField
                    key={field.id}
                    field={field}
                    value={answers[field.id]}
                    onChange={(v) => handleAnswerChange(field.id, v)}
                  />
                ))}
              </section>
            ))}

            {/* Step navigation + desktop submit */}
            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                {isMultiPart && currentState
                  ? `${currentState.answered} of ${currentState.total} answered in this step`
                  : `Counted time on this task: ${formatClock(clock.itemSeconds)}`}
              </span>

              <div className="flex items-center gap-2">
                {isMultiPart && currentIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => goToPart(stepParts[currentIndex - 1].id)}
                    className="rounded-full text-xs font-semibold gap-1.5 h-10 px-4"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                )}
                {isMultiPart && currentIndex < stepParts.length - 1 ? (
                  <Button
                    type="button"
                    disabled={Boolean(progress[currentIndex + 1]?.locked)}
                    onClick={() => goToPart(stepParts[currentIndex + 1].id)}
                    title={progress[currentIndex + 1]?.locked ? "Complete the earlier steps first" : undefined}
                    className="rounded-full text-xs font-bold gap-1.5 h-10 px-5"
                  >
                    Next step
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitting || !allComplete || isPreview}
                    className="hidden lg:inline-flex rounded-full text-xs font-bold gap-2 h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>Submit Evaluation</span>
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Bottom Action Bar with Claim Timer & Submit Button */}
      <StickyActionBar className="lg:hidden mt-6">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border ${
                isExpired
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : isUrgent
                  ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatCountdown(timeLeftMs)}</span>
            </div>
            <span className="text-xs font-bold text-primary font-mono">
              {formatClock(isHourly ? clock.sessionSeconds : clock.itemSeconds)}
            </span>
          </div>

          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting || !allComplete || isPreview}
            className="touch-target rounded-full text-xs font-bold gap-2 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs min-h-[44px]"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Submit</span>
          </Button>
        </div>
      </StickyActionBar>

      {/* Post-Submission Success Dialog via ResponsiveDialog */}
      <ResponsiveDialog
        open={successModal}
        onOpenChange={setSuccessModal}
        title="Task Submitted Successfully!"
        description={
          isHourly
            ? autoCredit
              ? `Your counted time has been credited. You are paid ${formatCents(rateCents)} for each completed hour.`
              : `Your counted time is credited once a reviewer approves this task. You are paid ${formatCents(rateCents)} for each completed hour.`
            : `Your evaluation has been submitted to the admin review queue. Upon approval, ${formatCents(rateCents)} will be credited to your wallet.`
        }
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/work/${task.slug}`)}
              className="touch-target w-full sm:w-auto rounded-full text-xs font-semibold min-h-[44px]"
            >
              Back to Task
            </Button>
            <Button
              size="sm"
              disabled={claimingNext}
              onClick={handleNextItem}
              className="touch-target w-full sm:w-auto rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
            >
              {claimingNext ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>Next Task</span>
            </Button>
          </>
        }
      >
        <div className="py-4 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Thank you for your submission. Your draft has been cleared and your evaluation recorded.
          </p>
        </div>
      </ResponsiveDialog>

      {/* Consistency warnings before submit */}
      <ResponsiveDialog
        open={Boolean(flagsDialog)}
        onOpenChange={(o) => !o && setFlagsDialog(null)}
        title="Please double-check these answers"
        description="Some answers look inconsistent. You can still submit; the reviewer will see these notes."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFlagsDialog(null)}
              className="touch-target w-full sm:w-auto rounded-full text-xs font-semibold min-h-[44px]"
            >
              Go back and check
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() => void doSubmit()}
              className="touch-target w-full sm:w-auto rounded-full text-xs font-bold gap-1.5 min-h-[44px]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit anyway
            </Button>
          </>
        }
      >
        <ul className="py-2 space-y-2">
          {(flagsDialog || []).map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </ResponsiveDialog>

      {/* Presence check (hourly) */}
      <ResponsiveDialog
        open={!isPreview && clock.paused === "needs_presence"}
        onOpenChange={() => {}}
        title="Still working?"
        description="The clock is paused. Confirm you are still here to keep counting time."
      >
        <div className="py-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mx-auto">
            <Hand className="h-7 w-7" />
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            We check in every 15 minutes so hours stay accurate. No time is counted until you confirm.
          </p>
          <Button
            type="button"
            disabled={confirming}
            onClick={handleConfirmPresence}
            className="rounded-full text-xs font-bold px-6 min-h-[44px] bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            I&apos;m still working
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

function stepShortTitle(part: Part, index: number) {
  const known: Record<string, string> = {
    part1: "Response A",
    part2: "Response B",
    part3: "Comparison",
    signoff: "Sign-off",
  };
  return known[part.id] ?? (part.title.length > 28 ? `Step ${index + 1}` : part.title);
}

/**
 * The case for the current step, driven by the step's `show` list: those payload keys, in that
 * order. A key that some other step shows (say response_b during Part 1) stays hidden so each
 * evaluation is independent; a key no step mentions (extra context) is always shown.
 */
function CasePane({
  item,
  part,
  parts,
  isMultiPart,
}: {
  item: WorkItem;
  part: Part;
  parts: Part[];
  isMultiPart: boolean;
}) {
  const payload = (item.payload || {}) as Record<string, unknown>;
  const mentioned = new Set(parts.flatMap((p) => p.show ?? []));
  const keys =
    isMultiPart && part.show?.length
      ? [
          ...part.show.filter((k) => k in payload),
          ...Object.keys(payload).filter((k) => !mentioned.has(k)),
        ]
      : Object.keys(payload);
  const hasPair = keys.includes("response_a") && keys.includes("response_b");
  const caseId = typeof payload.case_id === "string" ? payload.case_id : null;

  const block = (key: string) => {
    const val = payload[key];
    return (
      <div key={key} className="space-y-1.5 min-w-0">
        <span className="text-xs font-bold uppercase tracking-wider text-primary block break-words">
          {key === "prompt" ? "User prompt" : key === "response_a" ? "Response A" : key === "response_b" ? "Response B" : prettyKey(key)}
        </span>
        <div className="overflow-x-auto min-w-0 max-w-full p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words font-sans">
          {typeof val === "object" && val !== null ? (
            <pre className="font-mono text-xs overflow-x-auto whitespace-pre">{JSON.stringify(val, null, 2)}</pre>
          ) : (
            String(val ?? "")
          )}
        </div>
      </div>
    );
  };

  const rest = keys.filter((k) => !(hasPair && (k === "response_a" || k === "response_b")) && k !== "case_id");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {caseId ? `Case ${caseId}` : `Task #${item.id.slice(0, 8)}`}
        </span>
        {item.external_ref && (
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
            Ref: {item.external_ref}
          </span>
        )}
      </div>
      <div className="space-y-4 min-w-0">
        {rest.map(block)}
        {hasPair && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-w-0">
            {block("response_a")}
            {block("response_b")}
          </div>
        )}
      </div>
    </>
  );
}
