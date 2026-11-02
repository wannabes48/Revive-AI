"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Task, WorkItem } from "@/lib/supabase/types";
import { Field } from "@/lib/item-schema";
import { submitWork, releaseItem, startNextItem } from "@/actions/work";
import { formatCents } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
} from "@/components/ui/responsive-dialog";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import {
  Clock,
  AlertTriangle,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  LogOut,
  ArrowRight,
  Info,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WorkInterfaceProps {
  task: Task;
  item: WorkItem;
  rateCents: number;
}

export function WorkInterface({ task, item, rateCents }: WorkInterfaceProps) {
  const router = useRouter();

  const fields: Field[] = Array.isArray(task.item_schema) ? task.item_schema : [];
  const draftKey = `draft:${item.id}`;

  // Form answers state
  const [answers, setAnswers] = React.useState<Record<string, any>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {};
  });

  const [instructionsOpen, setInstructionsOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [releasing, setReleasing] = React.useState(false);
  const [successModal, setSuccessModal] = React.useState(false);
  const [claimingNext, setClaimingNext] = React.useState(false);

  // Time on item counter (visible tab only)
  const [secondsSpent, setSecondsSpent] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        setSecondsSpent((s) => s + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Draft auto-save to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saveTimer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    }, 1500);

    return () => clearTimeout(saveTimer);
  }, [answers, draftKey]);

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
  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Validate form readiness
  const isFormValid = React.useMemo(() => {
    for (const f of fields) {
      if (f.required === false) continue;
      const val = answers[f.id];

      if (f.type === "boolean") {
        if (typeof val !== "boolean") return false;
      } else if (f.type === "rating") {
        if (typeof val !== "number" || val < f.min || val > f.max) return false;
      } else if (f.type === "select") {
        if (!val || !(f.options || []).includes(val)) return false;
      } else if (f.type === "multiselect") {
        if (!Array.isArray(val) || val.length === 0) return false;
      } else if (f.type === "text") {
        if (!val || typeof val !== "string" || !val.trim()) return false;
        if (f.minLength && val.trim().length < f.minLength) return false;
      }
    }
    return true;
  }, [fields, answers]);

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please fill in all required fields before submitting.");
      return;
    }

    setSubmitting(true);
    const res = await submitWork(task.id, item.id, answers, secondsSpent);
    setSubmitting(false);

    if (res.error) {
      toast.error("Submission failed", { description: res.error });
      if (res.error.includes("no longer assigned")) {
        router.push(`/work/${task.slug}`);
      }
    } else {
      // Clear draft
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {}

      toast.success("Work submitted for review!");
      setSuccessModal(true);
    }
  }

  // Release Item Handler
  async function handleRelease() {
    if (!confirm("Are you sure you want to release this work item? It will be returned to the queue for other contributors.")) {
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
    const res = await startNextItem(task.id, task.slug);
    setClaimingNext(false);

    if (res?.empty) {
      toast.error("Queue Empty", { description: "No items available right now. Check back soon." });
      router.push(`/work/${task.slug}`);
    } else if (res?.error) {
      toast.error("Could not claim next item", { description: res.error });
      router.push(`/work/${task.slug}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Work Header */}
      <div className="sticky top-16 z-30 bg-card/95 backdrop-blur-md border border-border rounded-[14px] p-3.5 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/work/${task.slug}`}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            ← Task Home
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <h2 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
            {task.title}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Compensation Pill */}
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
            {formatCents(rateCents)} on approval
          </span>

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
              isExpired
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : isUrgent
                ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] animate-pulse"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatCountdown(timeLeftMs)}</span>
          </div>

          {/* Instructions Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInstructionsOpen(true)}
            className="rounded-full text-xs font-semibold gap-1.5 h-8 px-3"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Instructions</span>
          </Button>

          {/* Release Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={releasing || submitting}
            onClick={handleRelease}
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-3"
          >
            {releasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
            <span className="hidden sm:inline">Release</span>
          </Button>
        </div>
      </div>

      {/* Expired Warning Banner */}
      {isExpired && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Your claim timer has expired. Your submission will still be accepted unless another contributor claims this item first.
          </span>
        </div>
      )}

      {/* Collapsible Instructions Card */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setInstructionsOpen(!instructionsOpen)}
          aria-expanded={instructionsOpen}
          className="touch-target w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="font-heading text-sm font-bold text-foreground">
              Task Guidelines & Instructions
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
            <span>{instructionsOpen ? "Collapse" : "Expand"}</span>
            {instructionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {instructionsOpen && (
          <div className="p-4 pt-1 border-t border-border/60 text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans bg-muted/10 animate-in fade-in-0 duration-150">
            {task.instructions || task.description || "Follow benchmark guidelines carefully. Evaluate each field accurately."}
          </div>
        )}
      </div>

      {/* 2-Column Split: Item Payload (Stacked first on mobile) & Answer Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
        {/* Left Column: The Item Payload (Stacked first on mobile, Sticky on desktop) */}
        <div className="lg:col-span-7 bg-card rounded-[14px] border border-border p-4 sm:p-6 shadow-2xs space-y-4 lg:sticky lg:top-36 max-h-[calc(100dvh-160px)] overflow-y-auto min-w-0 max-w-full">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Work Item #{item.id.slice(0, 8)}
            </span>
            {item.external_ref && (
              <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
                Ref: {item.external_ref}
              </span>
            )}
          </div>

          {/* Render Item Payload with Horizontal Scroll for code/payload blocks */}
          <div className="space-y-4 min-w-0">
            {Object.entries(item.payload || {}).map(([key, val]) => (
              <div key={key} className="space-y-1.5 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-primary block break-words">
                  {key.replace(/_/g, " ")}
                </span>
                <div className="overflow-x-auto min-w-0 max-w-full p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words font-sans">
                  {typeof val === "object" ? (
                    <pre className="font-mono text-xs overflow-x-auto whitespace-pre">
                      {JSON.stringify(val, null, 2)}
                    </pre>
                  ) : (
                    String(val)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Dynamic Answer Form */}
        <div className="lg:col-span-5 bg-card rounded-[14px] border border-border p-4 sm:p-6 shadow-2xs space-y-5 min-w-0">
          <div className="pb-3 border-b border-border/60">
            <h3 className="font-heading font-bold text-base text-foreground">
              Evaluation Response
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Draft auto-saves continuously. Answer all required fields to submit.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map((field) => {
              const isRequired = field.required !== false;
              const val = answers[field.id];

              return (
                <div key={field.id} className="space-y-2 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <Label htmlFor={field.id} className="text-xs font-semibold text-foreground">
                      {field.label} {isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    {field.help && (
                      <span className="text-[11px] text-muted-foreground italic">
                        {field.help}
                      </span>
                    )}
                  </div>

                  {/* FIELD TYPE: RATING */}
                  {field.type === "rating" && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {Array.from({ length: field.max - field.min + 1 }).map((_, idx) => {
                        const score = field.min + idx;
                        const isSelected = val === score;

                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleAnswerChange(field.id, score)}
                            className={`touch-target flex items-center justify-center h-11 w-11 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-2xs scale-105"
                                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* FIELD TYPE: SELECT */}
                  {field.type === "select" && (
                    <select
                      id={field.id}
                      value={val || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-input bg-background px-3 text-base sm:text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <option value="">Select an option...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* FIELD TYPE: MULTISELECT */}
                  {field.type === "multiselect" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(field.options || []).map((opt) => {
                        const arr = Array.isArray(val) ? val : [];
                        const isChecked = arr.includes(opt);

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const next = isChecked
                                ? arr.filter((x: string) => x !== opt)
                                : [...arr, opt];
                              handleAnswerChange(field.id, next);
                            }}
                            className={`touch-target px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer min-h-[44px] ${
                              isChecked
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

                  {/* FIELD TYPE: BOOLEAN */}
                  {field.type === "boolean" && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(field.id, true)}
                        className={`touch-target flex-1 py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer min-h-[44px] ${
                          val === true
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
                        }`}
                      >
                        Yes / True
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(field.id, false)}
                        className={`touch-target flex-1 py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer min-h-[44px] ${
                          val === false
                            ? "bg-destructive text-destructive-foreground border-destructive shadow-2xs"
                            : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
                        }`}
                      >
                        No / False
                      </button>
                    </div>
                  )}

                  {/* FIELD TYPE: TEXT */}
                  {field.type === "text" && (
                    <Textarea
                      id={field.id}
                      value={val || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      placeholder="Write your detailed evaluation answer..."
                      rows={4}
                      className="text-base sm:text-xs bg-background leading-relaxed min-h-[100px]"
                    />
                  )}
                </div>
              );
            })}

            {/* Desktop-only in-form submit */}
            <div className="hidden lg:flex pt-3 border-t border-border/60 items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                Active time: {Math.floor(secondsSpent / 60)}m {secondsSpent % 60}s
              </span>

              <Button
                type="submit"
                disabled={submitting || !isFormValid}
                className="rounded-full text-xs font-bold gap-2 h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Submit Evaluation</span>
              </Button>
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
            <span className="text-xs font-bold text-primary">
              {formatCents(rateCents)}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isFormValid}
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
        title="Item Submitted Successfully!"
        description={`Your evaluation has been submitted to the admin review queue. Upon approval, ${formatCents(rateCents)} will be credited to your wallet.`}
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
              <span>Next Available Item</span>
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
    </div>
  );
}
