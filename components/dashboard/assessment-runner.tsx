"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startAssessment, submitAssessment } from "@/actions/onboarding";
import type {
  AssessmentAnswers,
  AssessmentResult,
  AssessmentSession,
  PublicQuestion,
} from "@/lib/assessment-types";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AlertCircle, Award, CheckCircle2, Loader2, Timer, XCircle } from "lucide-react";

interface AssessmentRunnerProps {
  stepId: string | null;
  stepTitle: string;
  onClose: () => void;
}

function countWords(text: string) {
  return (text.trim().match(/\S+/g) || []).length;
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

function draftKey(session: AssessmentSession) {
  return `assessment_draft_${session.assessment.stepId}_${session.attempt}`;
}

function readDraft(session: AssessmentSession): AssessmentAnswers {
  try {
    const raw = window.localStorage.getItem(draftKey(session));
    return raw ? (JSON.parse(raw) as AssessmentAnswers) : {};
  } catch {
    return {};
  }
}

export function AssessmentRunner({ stepId, stepTitle, onClose }: AssessmentRunnerProps) {
  const open = Boolean(stepId);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={stepTitle}
      description="Timed assessment — your answers are graded when you submit."
      variant="full-screen"
      className="sm:max-w-3xl! md:max-w-4xl!"
    >
      {stepId && <AssessmentBody key={stepId} stepId={stepId} onClose={onClose} />}
    </ResponsiveDialog>
  );
}

function AssessmentBody({ stepId, onClose }: { stepId: string; onClose: () => void }) {
  const router = useRouter();
  const [session, setSession] = React.useState<AssessmentSession | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<AssessmentAnswers>({});
  const [agreed, setAgreed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<AssessmentResult | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const autoSubmitted = React.useRef(false);

  // Start or resume the attempt on the server.
  React.useEffect(() => {
    let cancelled = false;
    startAssessment(stepId).then((res) => {
      if (cancelled) return;
      if (res.error || !res.session) {
        setLoadError(res.error || "Could not start the assessment.");
        router.refresh();
        return;
      }
      setSession(res.session);
      setAnswers(readDraft(res.session));
    });
    return () => {
      cancelled = true;
    };
  }, [stepId, router]);

  // Tick the countdown.
  React.useEffect(() => {
    if (!session || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session, result]);

  // Keep a local draft so an accidental close or refresh loses nothing.
  React.useEffect(() => {
    if (!session || result) return;
    try {
      window.localStorage.setItem(draftKey(session), JSON.stringify(answers));
    } catch {
      // storage unavailable — non-fatal
    }
  }, [answers, session, result]);

  const questions: PublicQuestion[] = React.useMemo(
    () => session?.assessment.tasks.flatMap((t) => t.questions) || [],
    [session]
  );

  const secondsLeft = session
    ? Math.floor((new Date(session.expiresAt).getTime() - now) / 1000)
    : 0;

  const unanswered = questions.filter((q) =>
    q.kind === "choice" ? !answers[q.id] : countWords(answers[q.id] || "") === 0
  );
  const shortWritten = questions.filter(
    (q) => q.kind === "written" && countWords(answers[q.id] || "") < q.minWords
  );

  const submit = React.useCallback(
    async (auto = false) => {
      if (!session || submitting) return;
      setSubmitting(true);
      const res = await submitAssessment(session.assessment.stepId, {
        answers,
        antiPlagiarismAgreed: auto ? true : agreed,
      });
      setSubmitting(false);
      if (res.error || !res.result) {
        toast.error(res.error || "Submission failed. Please try again.");
        if (res.error?.toLowerCase().includes("time ran out") || res.error?.includes("no longer active")) {
          router.refresh();
          onClose();
        }
        return;
      }
      try {
        window.localStorage.removeItem(draftKey(session));
      } catch {
        // ignore
      }
      setResult(res.result);
      router.refresh();
    },
    [session, submitting, answers, agreed, router, onClose]
  );

  // Auto-submit whatever is answered when the clock runs out.
  React.useEffect(() => {
    if (session && !result && secondsLeft <= 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      toast.info("Time is up — submitting your answers.");
      void submit(true);
    }
  }, [secondsLeft, session, result, submit]);

  if (loadError) {
    return (
      <div className="py-8 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
        <p className="text-sm text-foreground max-w-md mx-auto">{loadError}</p>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full text-xs">
          Close
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing your assessment…
      </div>
    );
  }

  if (result) {
    return <ResultView result={result} questions={questions} onClose={onClose} />;
  }

  const { assessment } = session;
  const lowTime = secondsLeft <= 60;
  const numberOf = (id: string) => questions.findIndex((q) => q.id === id) + 1;

  return (
    <div className="space-y-5 pt-1 pb-2">
      {/* Timer + meta */}
      <div className="sticky top-0 z-10 -mx-5 px-5 py-2.5 bg-card/95 backdrop-blur border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{assessment.title}</span> · Pass mark{" "}
          {assessment.passingScore}% · Attempt {session.attempt}
        </div>
        <div
          className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full border ${
            lowTime
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-amber-500/15 text-amber-800 border-amber-500/30"
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          <span>{formatClock(secondsLeft)}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {assessment.instructions} The timer keeps running if you close this window; you can come back
        and continue until it ends.
      </p>

      {assessment.tasks.map((task, ti) => (
        <section key={task.id} className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="font-heading text-sm font-bold text-foreground">
            Task {ti + 1} of {assessment.tasks.length}: {task.title}
          </h3>

          <div className="rounded-lg bg-muted/40 border border-border/60 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Prompt given to the model
            </span>
            <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{task.prompt}</p>
          </div>

          <div className={`grid gap-3 ${task.responses.length > 1 ? "md:grid-cols-2" : ""}`}>
            {task.responses.map((r) => (
              <div key={r.label} className="rounded-lg border border-border p-3">
                <span className="text-[11px] font-bold text-foreground">{r.label}</span>
                <pre className="mt-1.5 text-[11px] font-mono whitespace-pre-wrap text-foreground/90 bg-muted/30 p-2.5 rounded-md max-h-60 overflow-y-auto">
                  {r.content}
                </pre>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-1">
            {task.questions.map((q) => (
              <QuestionField
                key={q.id}
                number={numberOf(q.id)}
                question={q}
                value={answers[q.id] || ""}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              />
            ))}
          </div>
        </section>
      ))}

      <label className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 rounded border-border"
        />
        <span className="text-[11px] text-muted-foreground">
          I confirm these answers are my own work and that I did not use AI tools or outside help to write
          them.
        </span>
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {unanswered.length > 0
            ? `${unanswered.length} question${unanswered.length === 1 ? "" : "s"} still unanswered.`
            : shortWritten.length > 0
            ? "Some written answers are below the minimum length and will score 0."
            : "All questions answered."}
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="rounded-full text-xs">
            Close (timer keeps running)
          </Button>
          <Button
            type="button"
            disabled={submitting || !agreed || unanswered.length > 0}
            onClick={() => submit(false)}
            className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Submit for grading
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionField({
  number,
  question,
  value,
  onChange,
}: {
  number: number;
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  if (question.kind === "choice") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-foreground">
          {number}. {question.prompt}{" "}
          <span className="text-[10px] font-normal text-muted-foreground">({question.points} pts)</span>
        </legend>
        <div className="grid gap-1.5">
          {question.options.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                value === opt.id
                  ? "border-[#0F766E] bg-[#CCFBF1]/30"
                  : "border-border hover:border-[#0F766E]/40"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="mt-0.5 accent-[#0F766E]"
              />
              <span className="text-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const words = countWords(value);
  const enough = words >= question.minWords;
  return (
    <div className="space-y-1.5">
      <label htmlFor={`q_${question.id}`} className="text-xs font-semibold text-foreground block">
        {number}. {question.prompt}{" "}
        <span className="text-[10px] font-normal text-muted-foreground">({question.points} pts)</span>
      </label>
      <textarea
        id={`q_${question.id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        placeholder={question.placeholder}
        rows={5}
        className="w-full p-2.5 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
      />
      <div className={`text-[10px] font-mono ${enough ? "text-[#0F766E]" : "text-amber-700"}`}>
        {words} / {question.minWords} words minimum · pasting is disabled
      </div>
    </div>
  );
}

function ResultView({
  result,
  questions,
  onClose,
}: {
  result: AssessmentResult;
  questions: PublicQuestion[];
  onClose: () => void;
}) {
  const written = result.questions.filter((q) => q.kind === "written");
  const numberOf = (id: string) => questions.findIndex((q) => q.id === id) + 1;

  return (
    <div className="space-y-5 py-2">
      <div
        className={`p-5 rounded-xl border text-center space-y-2 ${
          result.passed ? "border-[#0F766E]/30 bg-[#CCFBF1]/25" : "border-destructive/30 bg-destructive/5"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
            result.passed ? "bg-[#0F766E] text-white" : "bg-destructive/15 text-destructive"
          }`}
        >
          {result.passed ? <Award className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
        </div>
        <div className="font-heading text-3xl font-black text-foreground">{result.score}%</div>
        <p className="text-sm font-semibold text-foreground">
          {result.passed
            ? "Passed — the next onboarding step is now unlocked."
            : `Not passed — ${result.passingScore}% is needed.`}
        </p>
        {!result.passed && result.retryAvailableAt && (
          <p className="text-xs text-muted-foreground">
            You can retry from {new Date(result.retryAvailableAt).toLocaleString()}.
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-border">
          <div className="text-muted-foreground">Multiple-choice questions</div>
          <div className="font-bold text-foreground text-base">
            {result.choiceCorrect} / {result.choiceTotal} correct
          </div>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <div className="text-muted-foreground">Written answers</div>
          <div className="font-bold text-foreground text-base">
            {result.writtenEarned} / {result.writtenMax} points
          </div>
        </div>
      </div>

      {written.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground">Feedback on your written answers</h4>
          {written.map((q) => (
            <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg border border-border text-xs">
              {q.earned === q.max ? (
                <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold text-foreground">
                  Question {numberOf(q.id)} — {q.earned}/{q.max} pts.
                </span>{" "}
                <span className="text-muted-foreground">{q.feedback}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onClose}
          className="rounded-full text-xs font-bold px-6 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
        >
          {result.passed ? "Continue" : "Close"}
        </Button>
      </div>
    </div>
  );
}
