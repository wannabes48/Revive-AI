"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Submission, Task } from "@/lib/supabase/types";
import { Field } from "@/lib/item-schema";
import { reviewSubmission } from "@/actions/admin-work";
import { formatDate, formatDateTime, formatCents } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  AlertCircle,
  Hourglass,
  Star,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  User,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
} from "lucide-react";

export interface ReviewQueueSubmission extends Omit<Submission, "profile" | "task" | "work_item"> {
  task: Task;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    expertise: string | null;
  };
  work_item: {
    id: string;
    external_ref: string | null;
    payload: Record<string, any>;
  };
  contributorStats: {
    approvedCount: number;
    totalReviewed: number;
    approvalRate: number;
    avgScore: number | null;
  };
}

interface ReviewQueueProps {
  submissions: ReviewQueueSubmission[];
  tasks: Task[];
}

export function ReviewQueue({ submissions: initialSubmissions, tasks }: ReviewQueueProps) {
  const router = useRouter();

  const [submissions, setSubmissions] = React.useState<ReviewQueueSubmission[]>(initialSubmissions);
  const [selectedIdx, setSelectedIdx] = React.useState<number>(0);
  const [taskFilter, setTaskFilter] = React.useState<string>("all");

  // Review Form State for current submission
  const [score, setScore] = React.useState<number>(5);
  const [reviewerNote, setReviewerNote] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<"item" | "answers" | "review">("answers");

  const filteredSubmissions = React.useMemo(() => {
    if (taskFilter === "all") return submissions;
    return submissions.filter((s) => s.task_id === taskFilter);
  }, [submissions, taskFilter]);

  const current = filteredSubmissions[selectedIdx] || null;

  // Reset form when active submission changes
  React.useEffect(() => {
    setScore(5);
    setReviewerNote("");
  }, [current?.id]);

  // Adjust selectedIdx if out of range
  React.useEffect(() => {
    if (selectedIdx >= filteredSubmissions.length && filteredSubmissions.length > 0) {
      setSelectedIdx(filteredSubmissions.length - 1);
    }
  }, [filteredSubmissions.length, selectedIdx]);

  // Handle Decision
  async function handleDecision(decision: "approved" | "rejected" | "revision_requested") {
    if (!current) return;

    if ((decision === "rejected" || decision === "revision_requested") && !reviewerNote.trim()) {
      toast.error("Feedback Note Required", {
        description: "Please provide a reviewer note explaining the decision.",
      });
      return;
    }

    setIsSubmitting(true);
    const res = await reviewSubmission(
      current.id,
      decision,
      reviewerNote.trim() || undefined,
      score
    );
    setIsSubmitting(false);

    if (res.error) {
      toast.error("Review failed", { description: res.error });
    } else {
      toast.success(
        decision === "approved"
          ? "Submission Approved"
          : decision === "rejected"
          ? "Submission Rejected"
          : "Revision Requested"
      );

      // Remove current submission from local queue
      const remaining = submissions.filter((s) => s.id !== current.id);
      setSubmissions(remaining);
      router.refresh();
    }
  }

  // Keyboard Shortcuts: A (approve), V (revision), R (reject), J (next), K (prev)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is typing in textarea or input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input" || tag === "select") {
        return;
      }

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleDecision("approved");
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        handleDecision("revision_requested");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleDecision("rejected");
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (selectedIdx < filteredSubmissions.length - 1) {
          setSelectedIdx((prev) => prev + 1);
        }
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (selectedIdx > 0) {
          setSelectedIdx((prev) => prev - 1);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, selectedIdx, filteredSubmissions.length, score, reviewerNote]);

  const fields: Field[] = current?.task?.item_schema && Array.isArray(current.task.item_schema)
    ? current.task.item_schema
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit contributor evaluations, assign quality scores, and approve earnings.
          </p>
        </div>

        {/* Task Filter */}
        <div className="flex items-center gap-3">
          <select
            value={taskFilter}
            onChange={(e) => {
              setTaskFilter(e.target.value);
              setSelectedIdx(0);
            }}
            className="h-9 px-3 rounded-full border border-border bg-card text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="all">All Tasks ({submissions.length} in queue)</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {current ? (
        <div className="space-y-4">
          {/* Queue Navigation Bar & Keyboard Shortcut Pill */}
          <div className="bg-card rounded-[14px] border border-border p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">
                Item {selectedIdx + 1} of {filteredSubmissions.length}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground font-mono">
                Submission: {current.id.slice(0, 8)}
              </span>
              {current.work_item?.external_ref && (
                <span className="text-xs text-muted-foreground font-mono">
                  (Ref: {current.work_item.external_ref})
                </span>
              )}
            </div>

            {/* Shortcuts indicator */}
            <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full border border-border/50">
              <Keyboard className="h-3.5 w-3.5" />
              <span>
                Shortcuts: <kbd className="font-mono font-bold bg-card px-1 rounded border">A</kbd> Approve,{" "}
                <kbd className="font-mono font-bold bg-card px-1 rounded border">V</kbd> Revision,{" "}
                <kbd className="font-mono font-bold bg-card px-1 rounded border">R</kbd> Reject,{" "}
                <kbd className="font-mono font-bold bg-card px-1 rounded border">J/K</kbd> Next/Prev
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIdx <= 0}
                onClick={() => setSelectedIdx((prev) => prev - 1)}
                className="h-8 w-8 p-0 rounded-full"
                title="Previous submission (K)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIdx >= filteredSubmissions.length - 1}
                onClick={() => setSelectedIdx((prev) => prev + 1)}
                className="h-8 w-8 p-0 rounded-full"
                title="Next submission (J)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Pane Tabs (< lg) */}
          <div className="lg:hidden flex items-center p-1 rounded-xl bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => setMobileTab("answers")}
              className={`touch-target flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileTab === "answers"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Answers
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("item")}
              className={`touch-target flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileTab === "item"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Item Payload
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("review")}
              className={`touch-target flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                mobileTab === "review"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Review Form
            </button>
          </div>

          {/* Three-Pane View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
            {/* PANE 1: The Item Payload (4 cols) */}
            <div className={`lg:col-span-4 bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-2xs space-y-4 max-h-[calc(100dvh-220px)] overflow-y-auto min-w-0 ${
              mobileTab === "item" ? "block" : "hidden lg:block"
            }`}>
              <div className="pb-3 border-b border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Task Item Payload
                </span>
                <h3 className="font-heading font-bold text-sm text-foreground mt-0.5 break-words">
                  {current.task.title}
                </h3>
              </div>

              <div className="space-y-3.5 text-xs min-w-0">
                {Object.entries(current.work_item?.payload || {}).map(([key, val]) => (
                  <div key={key} className="space-y-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary block break-words">
                      {key.replace(/_/g, " ")}
                    </span>
                    <div className="overflow-x-auto min-w-0 max-w-full p-3 rounded-xl bg-muted/20 border border-border/60 text-foreground whitespace-pre-wrap break-words font-sans leading-relaxed">
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

            {/* PANE 2: Contributor Answers (4 cols) */}
            <div className={`lg:col-span-4 bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-2xs space-y-4 max-h-[calc(100dvh-220px)] overflow-y-auto min-w-0 ${
              mobileTab === "answers" ? "block" : "hidden lg:block"
            }`}>
              <div className="pb-3 border-b border-border/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contributor Answers
                </span>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                  <span className="font-heading font-bold text-sm text-foreground truncate">
                    {current.profile.full_name || current.profile.email}
                  </span>
                  {current.seconds_spent != null && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      ({Math.round(current.seconds_spent / 60)}m spent)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-xs min-w-0">
                {fields.map((f) => {
                  const val = current.answers[f.id];

                  return (
                    <div key={f.id} className="space-y-1 min-w-0">
                      <span className="text-[11px] font-bold text-foreground block break-words">
                        {f.label}
                      </span>

                      <div className="overflow-x-auto min-w-0 max-w-full p-3 rounded-xl bg-muted/20 border border-border/60 text-foreground leading-relaxed break-words">
                        {f.type === "rating" ? (
                          <div className="flex items-center gap-1 font-bold text-sm text-primary">
                            <Star className="h-4 w-4 fill-primary" />
                            <span>{val} / {f.max}</span>
                          </div>
                        ) : f.type === "boolean" ? (
                          <span className={`font-bold ${val ? "text-[#0F766E]" : "text-destructive"}`}>
                            {val ? "Yes / True" : "No / False"}
                          </span>
                        ) : f.type === "multiselect" && Array.isArray(val) ? (
                          <div className="flex flex-wrap gap-1">
                            {val.map((item: string) => (
                              <span
                                key={item}
                                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="whitespace-pre-wrap">{val != null ? String(val) : "—"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="overflow-x-auto p-3 rounded-xl bg-muted/20 border border-border/60 font-mono text-[11px] whitespace-pre">
                    {JSON.stringify(current.answers, null, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* PANE 3: Review Decision Panel & Contributor Context (4 cols) */}
            <div className={`lg:col-span-4 space-y-4 min-w-0 ${
              mobileTab === "review" ? "block" : "hidden lg:block"
            }`}>
              {/* Contributor Stats Context */}
              <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Contributor Vetting Context
                </span>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase block">Approved</span>
                    <span className="font-heading font-bold text-sm text-foreground mt-0.5 block">
                      {current.contributorStats.approvedCount}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase block">Approval Rate</span>
                    <span className="font-heading font-bold text-sm text-[#0F766E] mt-0.5 block">
                      {current.contributorStats.approvalRate}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase block">Avg Score</span>
                    <span className="font-heading font-bold text-sm text-amber-500 mt-0.5 block">
                      {current.contributorStats.avgScore ? `${current.contributorStats.avgScore}★` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Form */}
              <div className="bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-2xs space-y-4">
                <h4 className="font-heading font-bold text-sm text-foreground">
                  Reviewer Evaluation
                </h4>

                {/* Quality Score Stars */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Quality Score (1 to 5)</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScore(s)}
                        className={`touch-target flex items-center justify-center h-10 w-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          score === s
                            ? "bg-amber-500 text-white shadow-2xs scale-105"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted border border-border"
                        }`}
                      >
                        {s}★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviewer Note */}
                <div className="space-y-1.5">
                  <Label htmlFor="rev_note" className="text-xs font-semibold">
                    Reviewer Note / Feedback
                  </Label>
                  <Textarea
                    id="rev_note"
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    placeholder="Required for rejections and revision requests..."
                    rows={3}
                    className="text-base sm:text-xs bg-background min-h-[80px]"
                  />
                </div>

                {/* Desktop Decision Buttons */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDecision("approved")}
                    className="touch-target w-full rounded-full text-xs font-bold gap-2 min-h-[44px] bg-[#0F766E] text-white hover:bg-[#0D655E] shadow-2xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Approve Work<span className="hidden md:inline"> (A)</span></span>
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleDecision("revision_requested")}
                      className="touch-target rounded-full text-xs font-semibold text-[#78350F] border-[#FDE68A] hover:bg-[#FEF3C7] gap-1 min-h-[44px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Revision<span className="hidden md:inline"> (V)</span></span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => handleDecision("rejected")}
                      className="touch-target rounded-full text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1 min-h-[44px]"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject<span className="hidden md:inline"> (R)</span></span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Mobile Decision Bar */}
          <div className="lg:hidden sticky bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border p-3 pb-safe shadow-xl mt-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision("approved")}
                className="touch-target flex-1 rounded-full text-xs font-bold gap-1.5 min-h-[44px] bg-[#0F766E] text-white hover:bg-[#0D655E] shadow-2xs"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Approve</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleDecision("revision_requested")}
                className="touch-target px-3 rounded-full text-xs font-semibold text-[#78350F] border-[#FDE68A] hover:bg-[#FEF3C7] min-h-[44px]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Revision</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => handleDecision("rejected")}
                className="touch-target px-3 rounded-full text-xs font-semibold text-destructive hover:bg-destructive/10 min-h-[44px]"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Reject</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center bg-card rounded-[14px] border border-dashed border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-foreground">
            Review Queue All Cleared!
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There are no pending submissions awaiting review right now. All contributor evaluations are processed.
          </p>
        </div>
      )}
    </div>
  );
}
