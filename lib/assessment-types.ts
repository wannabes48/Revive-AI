/**
 * Client-safe assessment shapes. Answer keys and grading rubrics live in
 * `lib/assessments.ts`, which must only ever be imported by server code.
 */

export type AssessmentStepId =
  | "step_4_assessment_10m"
  | "step_4_assessment_120m"
  | "step_4_assessment_150m";

export type PublicChoiceQuestion = {
  id: string;
  kind: "choice";
  prompt: string;
  options: { id: string; label: string }[];
  points: number;
};

export type PublicWrittenQuestion = {
  id: string;
  kind: "written";
  prompt: string;
  minWords: number;
  placeholder?: string;
  points: number;
};

export type PublicQuestion = PublicChoiceQuestion | PublicWrittenQuestion;

export type PublicAssessmentTask = {
  id: string;
  title: string;
  /** The prompt the models were given. */
  prompt: string;
  responses: { label: string; content: string }[];
  questions: PublicQuestion[];
};

export type PublicAssessment = {
  stepId: AssessmentStepId;
  title: string;
  durationMinutes: number;
  passingScore: number;
  instructions: string;
  tasks: PublicAssessmentTask[];
};

export type AssessmentAnswers = Record<string, string>;

export type QuestionResult = {
  id: string;
  kind: "choice" | "written";
  earned: number;
  max: number;
  /** Shown to the contributor. Never reveals the correct option. */
  feedback?: string;
};

export type AssessmentResult = {
  score: number;
  passed: boolean;
  passingScore: number;
  choiceCorrect: number;
  choiceTotal: number;
  writtenEarned: number;
  writtenMax: number;
  questions: QuestionResult[];
  retryAvailableAt: string | null;
  timedOut?: boolean;
};

export type AssessmentSession = {
  assessment: PublicAssessment;
  startedAt: string;
  expiresAt: string;
  attempt: number;
};
