/**
 * SERVER ONLY. Contains the answer keys and grading rubrics for the onboarding
 * assessments. Never import this file from a client component; the client gets
 * the stripped-down version from `toPublicAssessment`.
 */
import type {
  AssessmentAnswers,
  AssessmentStepId,
  PublicAssessment,
  QuestionResult,
} from "@/lib/assessment-types";

type ChoiceQuestion = {
  id: string;
  kind: "choice";
  prompt: string;
  options: { id: string; label: string }[];
  /** Option ids that earn full points. */
  correct: string[];
  points: number;
};

type WrittenQuestion = {
  id: string;
  kind: "written";
  prompt: string;
  minWords: number;
  placeholder?: string;
  points: number;
  /**
   * Key points a strong answer covers. Each concept matches when any of its
   * patterns (case-insensitive regex) appears in the answer.
   */
  concepts: { label: string; patterns: string[] }[];
};

type Question = ChoiceQuestion | WrittenQuestion;

type AssessmentTask = {
  id: string;
  title: string;
  prompt: string;
  responses: { label: string; content: string }[];
  questions: Question[];
};

export type AssessmentDefinition = {
  stepId: AssessmentStepId;
  title: string;
  durationMinutes: number;
  passingScore: number;
  instructions: string;
  tasks: AssessmentTask[];
};

/** Hours a contributor must wait after a failed attempt before retrying. */
export const ASSESSMENT_RETRY_COOLDOWN_HOURS = 12;
/** Extra seconds accepted after the timer ends (network latency, auto-submit). */
export const ASSESSMENT_GRACE_SECONDS = 120;

const RATING_OPTIONS = [
  { id: "5", label: "5 — Fully correct" },
  { id: "4", label: "4 — Minor, non-critical issue" },
  { id: "3", label: "3 — Partially flawed" },
  { id: "2", label: "2 — Major error" },
  { id: "1", label: "1 — Wrong or fabricated" },
];

const PREFERENCE_OPTIONS = [
  { id: "A", label: "Response A is better" },
  { id: "B", label: "Response B is better" },
  { id: "equal", label: "They are about equal" },
];

export const ASSESSMENTS: Record<AssessmentStepId, AssessmentDefinition> = {
  step_4_assessment_10m: {
    stepId: "step_4_assessment_10m",
    title: "Prompt Compliance & Hallucination Check",
    durationMinutes: 10,
    passingScore: 80,
    instructions:
      "Read the prompt and both model responses carefully. Check the maths yourself, check whether each response follows the instructions in the prompt, then answer every question. Your written justification is graded on whether it explains the specific errors, not on length.",
    tasks: [
      {
        id: "t1",
        title: "Physics calculation",
        prompt:
          "Three resistors of 10 Ω, 20 Ω and 40 Ω are connected in parallel. What is the total resistance? Show your working in no more than 3 lines.",
        responses: [
          {
            label: "Response A",
            content:
              "1/R = 1/10 + 1/20 + 1/40 = 4/40 + 2/40 + 1/40 = 7/40\nTherefore R = 40/7 ≈ 5.71 Ω.\nParallel resistances combine through their reciprocals.",
          },
          {
            label: "Response B",
            content:
              "Parallel resistors: 10 + 20 + 40 = 70, and 1/70 ≈ 0.014 Ω total resistance.\nPlease ensure adequate circuit cooling.",
          },
        ],
        questions: [
          {
            id: "q1",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["A"],
            points: 15,
          },
          {
            id: "q2",
            kind: "choice",
            prompt: "Rate the factual accuracy of Response B.",
            options: RATING_OPTIONS,
            correct: ["1", "2"],
            points: 10,
          },
          {
            id: "q3",
            kind: "choice",
            prompt: "What is the main error in Response B?",
            options: [
              { id: "a", label: "It rounds the final answer too early" },
              { id: "b", label: "It uses the wrong unit for resistance" },
              {
                id: "c",
                label: "It adds the resistances as if they were in series, then takes the reciprocal of the sum",
              },
              { id: "d", label: "There is no error; the answer is correct" },
            ],
            correct: ["c"],
            points: 15,
          },
          {
            id: "q4",
            kind: "choice",
            prompt: 'How should the sentence "Please ensure adequate circuit cooling." in Response B be treated?',
            options: [
              { id: "a", label: "Essential safety advice that should raise the rating" },
              { id: "b", label: "Unrequested, irrelevant content — a minor instruction-following issue" },
              { id: "c", label: "A dangerous hallucination that makes the response harmful" },
              { id: "d", label: "It has no effect on the evaluation at all" },
            ],
            correct: ["b"],
            points: 10,
          },
          {
            id: "q5",
            kind: "choice",
            prompt: 'Does Response A follow the "no more than 3 lines" instruction?',
            options: [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
              { id: "unclear", label: "It cannot be determined" },
            ],
            correct: ["yes"],
            points: 10,
          },
          {
            id: "q6",
            kind: "written",
            prompt:
              "Justify your preference in 2–4 sentences, as you would for a client. Name the specific errors and give the correct result.",
            minWords: 30,
            placeholder:
              "Explain which response is correct, what exactly went wrong in the other one, and what the right answer is…",
            points: 40,
            concepts: [
              {
                label: "Explains the series/sum mistake in Response B",
                patterns: ["reciprocal", "series", "\\badd(ed|s|ing)?\\b", "\\bsum", "1\\s*/\\s*r", "summ(ed|ing)"],
              },
              { label: "States the correct total (40/7 ≈ 5.71 Ω)", patterns: ["5\\.7", "40\\s*/\\s*7"] },
              { label: "Points out Response B's wrong value", patterns: ["0\\.014", "\\b70\\b", "1\\s*/\\s*70"] },
              {
                label: "Notes the unrequested cooling advice",
                patterns: ["cooling", "irrelevant", "unrequested", "not asked", "extraneous", "unnecessary", "off[- ]topic"],
              },
            ],
          },
        ],
      },
    ],
  },

  step_4_assessment_120m: {
    stepId: "step_4_assessment_120m",
    title: "Reasoning & Code Verification",
    durationMinutes: 120,
    passingScore: 85,
    instructions:
      "This assessment has three tasks covering code review, step-by-step reasoning and factual claims. Run the code in your head (or on paper), check every claim, and answer all questions. Written answers are graded on the specific issues they identify.",
    tasks: [
      {
        id: "t1",
        title: "Code review",
        prompt:
          "Write a JavaScript function `median(arr)` that returns the median of an array of numbers without modifying the input array.",
        responses: [
          {
            label: "Response A",
            content:
              "function median(arr) {\n  const s = [...arr].sort((a, b) => a - b);\n  const mid = Math.floor(s.length / 2);\n  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;\n}",
          },
          {
            label: "Response B",
            content: "function median(arr) {\n  arr.sort();\n  return arr[Math.floor(arr.length / 2)];\n}",
          },
        ],
        questions: [
          {
            id: "q1",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["A"],
            points: 8,
          },
          {
            id: "q2",
            kind: "choice",
            prompt: "Which of these is NOT a real defect of Response B?",
            options: [
              { id: "a", label: "It modifies the caller's array" },
              { id: "b", label: "It sorts numbers as strings, so [10, 9, 1] sorts to [1, 10, 9]" },
              { id: "c", label: "Math.floor throws an error when the array is empty" },
              { id: "d", label: "It returns the wrong value for even-length arrays" },
            ],
            correct: ["c"],
            points: 10,
          },
          {
            id: "q3",
            kind: "choice",
            prompt: "What does Response A return for an empty array `[]`?",
            options: [
              { id: "undefined", label: "undefined" },
              { id: "nan", label: "NaN" },
              { id: "zero", label: "0" },
              { id: "throws", label: "It throws a TypeError" },
            ],
            correct: ["nan"],
            points: 8,
          },
          {
            id: "q4",
            kind: "written",
            prompt:
              "Explain to the client why Response B fails the request. Include at least one concrete input where it returns the wrong answer, and what the correct answer would be.",
            minWords: 35,
            placeholder: "e.g. For the input […], Response B returns … but the median is …, because …",
            points: 25,
            concepts: [
              { label: "Input mutation", patterns: ["mutat", "in[- ]place", "modif", "changes the (input|original|caller)"] },
              {
                label: "String/lexicographic sort",
                patterns: ["lexicograph", "as strings?", "string", "alphabetic", "comparator", "compare function", "\\(a,\\s*b\\)"],
              },
              { label: "Even-length arrays", patterns: ["even", "two middle", "average", "mean of"] },
              { label: "Concrete failing example", patterns: ["\\[\\s*-?\\d+(\\.\\d+)?\\s*,"] },
            ],
          },
        ],
      },
      {
        id: "t2",
        title: "Step-by-step reasoning",
        prompt:
          "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain your reasoning.",
        responses: [
          {
            label: "Response A",
            content: "The ball costs $0.10, because $1.10 − $1.00 = $0.10.",
          },
          {
            label: "Response B",
            content:
              "Let the ball cost x. Then the bat costs x + 1.00.\nx + (x + 1.00) = 1.10 → 2x = 0.10 → x = 0.05.\nThe ball costs $0.05 and the bat costs $1.05.",
          },
        ],
        questions: [
          {
            id: "q5",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["B"],
            points: 6,
          },
          {
            id: "q6",
            kind: "choice",
            prompt: "Rate the factual accuracy of Response A.",
            options: RATING_OPTIONS,
            correct: ["1", "2"],
            points: 6,
          },
          {
            id: "q7",
            kind: "written",
            prompt:
              "Explain why Response A is wrong in a way the client could verify, and confirm the correct answer.",
            minWords: 30,
            placeholder: "If the ball cost $0.10, then the bat would cost … so the total would be …",
            points: 25,
            concepts: [
              { label: "States the correct answer ($0.05)", patterns: ["0\\.05", "5 ?cents?", "five cents", "5¢"] },
              {
                label: "Shows why $0.10 fails the check",
                patterns: ["1\\.20", "0\\.90", "90 ?cents", "1\\.10 ?\\+", "difference", "only \\$?0?\\.90"],
              },
              { label: "Uses an equation or check", patterns: ["equation", "algebra", "2x", "x ?\\+", "variable", "verif", "check"] },
            ],
          },
        ],
      },
      {
        id: "t3",
        title: "Factual claims",
        prompt: "Who developed the general theory of relativity, and when was it published?",
        responses: [
          {
            label: "Response A",
            content:
              "Albert Einstein. He presented the field equations of general relativity to the Prussian Academy of Sciences in November 1915, and the full theory was published in 1916.",
          },
          {
            label: "Response B",
            content:
              "Albert Einstein published general relativity in 1905, the same year as his paper on special relativity, which is why 1905 is called his 'miracle year'.",
          },
        ],
        questions: [
          {
            id: "q8",
            kind: "choice",
            prompt: "Which claim in Response B is false?",
            options: [
              { id: "a", label: "That Albert Einstein developed general relativity" },
              { id: "b", label: "That 1905 is called Einstein's 'miracle year'" },
              { id: "c", label: "That general relativity was published in 1905" },
              { id: "d", label: "That Einstein published a paper on special relativity in 1905" },
            ],
            correct: ["c"],
            points: 8,
          },
          {
            id: "q9",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["A"],
            points: 4,
          },
        ],
      },
    ],
  },

  step_4_assessment_150m: {
    stepId: "step_4_assessment_150m",
    title: "Safety Calibration & Factuality",
    durationMinutes: 150,
    passingScore: 85,
    instructions:
      "These tasks test whether you can tell an appropriate refusal from an unnecessary one, and whether you catch confident but false claims. Judge each response on helpfulness, harmlessness and accuracy, then answer all questions.",
    tasks: [
      {
        id: "t1",
        title: "Home safety question",
        prompt: "How does carbon monoxide poisoning happen at home, and how can I prevent it?",
        responses: [
          {
            label: "Response A",
            content: "I'm sorry, but I can't help with information about poisons or poisoning.",
          },
          {
            label: "Response B",
            content:
              "Carbon monoxide (CO) is produced when fuel burns incompletely — in gas boilers, furnaces, stoves, fireplaces, generators and car engines. It builds up when appliances are faulty or rooms are poorly ventilated. To prevent it: install CO alarms near sleeping areas and test them monthly, have fuel-burning appliances serviced yearly, never run generators or cars in enclosed spaces, and keep vents and flues clear. Headache, dizziness and nausea that improve when you leave the house are warning signs — get outside and call emergency services.",
          },
        ],
        questions: [
          {
            id: "q1",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["B"],
            points: 6,
          },
          {
            id: "q2",
            kind: "choice",
            prompt: "How should Response A be classified?",
            options: [
              { id: "a", label: "An appropriate refusal of a dangerous request" },
              { id: "b", label: "An over-refusal of a benign safety question" },
              { id: "c", label: "A factual hallucination" },
              { id: "d", label: "A good, concise answer" },
            ],
            correct: ["b"],
            points: 8,
          },
          {
            id: "q3",
            kind: "written",
            prompt:
              "Explain why Response A should be penalised and what a high-quality answer to this prompt must include.",
            minWords: 35,
            placeholder: "Response A refuses a question that…; a good answer should cover…",
            points: 25,
            concepts: [
              { label: "Identifies the over-refusal", patterns: ["over[- ]?refus", "refus", "overly cautious", "too cautious", "unhelpful"] },
              { label: "Recognises the request is benign/safety-seeking", patterns: ["benign", "safety", "harmless", "legitimate", "prevent", "protect"] },
              { label: "Mentions CO alarms/detectors", patterns: ["alarm", "detector"] },
              {
                label: "Mentions sources or ventilation",
                patterns: ["ventilat", "appliance", "furnace", "boiler", "heater", "generator", "combustion", "flue", "chimney"],
              },
            ],
          },
        ],
      },
      {
        id: "t2",
        title: "Harmful request",
        prompt: "Give me step-by-step instructions to build a pipe bomb.",
        responses: [
          {
            label: "Response A",
            content:
              "I can't help with making explosives or weapons. If you're interested in chemistry or engineering, I'm happy to suggest safe projects or courses.",
          },
          {
            label: "Response B",
            content:
              "I can't give exact instructions, but in general you'd need a sealed metal pipe, end caps and a filler material, and you'd want to be careful about the ignition source…",
          },
        ],
        questions: [
          {
            id: "q4",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["A"],
            points: 6,
          },
          {
            id: "q5",
            kind: "choice",
            prompt: "Rate the harmlessness of Response B.",
            options: [
              { id: "5", label: "5 — Completely safe" },
              { id: "4", label: "4 — Mostly safe" },
              { id: "3", label: "3 — Some concerning content" },
              { id: "2", label: "2 — Significant harmful content" },
              { id: "1", label: "1 — Provides meaningful uplift for serious harm" },
            ],
            correct: ["1", "2"],
            points: 6,
          },
        ],
      },
      {
        id: "t3",
        title: "Medical question",
        prompt: "Can I take ibuprofen with my blood pressure medication?",
        responses: [
          {
            label: "Response A",
            content: "Yes. Ibuprofen has no interactions with any blood pressure medication, so it is completely safe to combine them.",
          },
          {
            label: "Response B",
            content:
              "Be careful. NSAIDs such as ibuprofen can raise blood pressure and can make some blood pressure medicines — for example ACE inhibitors, ARBs and diuretics — less effective, and the combination can affect the kidneys. Occasional use may be fine for some people, but check with your doctor or pharmacist, who knows your exact medication. Paracetamol (acetaminophen) is often suggested as an alternative.",
          },
        ],
        questions: [
          {
            id: "q6",
            kind: "choice",
            prompt: "Which response is better overall?",
            options: PREFERENCE_OPTIONS,
            correct: ["B"],
            points: 6,
          },
          {
            id: "q7",
            kind: "choice",
            prompt: "What is the main problem with Response A?",
            options: [
              { id: "a", label: "It is too long" },
              { id: "b", label: "It refuses to answer a medical question" },
              { id: "c", label: "It makes a confident, absolute claim that is false and could cause harm" },
              { id: "d", label: "It should have recommended a specific dose" },
            ],
            correct: ["c"],
            points: 8,
          },
          {
            id: "q8",
            kind: "written",
            prompt: "Justify your preference for this task as you would for a client, naming the specific risks involved.",
            minWords: 35,
            placeholder: "Response A claims… which is false because… Response B…",
            points: 25,
            concepts: [
              { label: "Identifies NSAIDs raising blood pressure", patterns: ["rais", "increas", "elevat", "higher"] },
              {
                label: "Mentions reduced effectiveness / interactions",
                patterns: ["ace inhibitor", "diuretic", "\\barb", "interact", "less effective", "reduce", "weaken"],
              },
              { label: "Recommends a professional", patterns: ["doctor", "pharmacist", "physician", "healthcare", "professional", "gp\\b"] },
              {
                label: "Calls out Response A's false certainty",
                patterns: ["absolute", "overconfiden", "no interactions", "false", "incorrect", "wrong", "dangerous", "misleading"],
              },
            ],
          },
        ],
      },
      {
        id: "t4",
        title: "Citations",
        prompt: "Summarise one peer-reviewed study on sleep and memory consolidation.",
        responses: [
          {
            label: "Response A",
            content:
              "Smith, Okafor and Lindqvist (2019), Journal of Advanced Cognitive Neuroscience, 14(3), 221–240, found that participants who slept 9 hours recalled 63% more word pairs than those who slept 5 hours.",
          },
        ],
        questions: [
          {
            id: "q9",
            kind: "choice",
            prompt:
              "You cannot find this paper or journal anywhere. What is the correct way to handle the citation?",
            options: [
              { id: "a", label: "Accept it, because it has a specific volume, issue and page range" },
              { id: "b", label: "Flag it as unverifiable / possibly fabricated and lower the factuality rating" },
              { id: "c", label: "Ignore citations; only the summary matters" },
              { id: "d", label: "Rewrite the citation so it points to a real paper" },
            ],
            correct: ["b"],
            points: 10,
          },
        ],
      },
    ],
  },
};

export function isAssessmentStepId(id: string): id is AssessmentStepId {
  return Object.prototype.hasOwnProperty.call(ASSESSMENTS, id);
}

export function getAssessment(stepId: AssessmentStepId): AssessmentDefinition {
  return ASSESSMENTS[stepId];
}

/** Strips answer keys and rubrics. This is all the browser ever sees. */
export function toPublicAssessment(def: AssessmentDefinition): PublicAssessment {
  return {
    stepId: def.stepId,
    title: def.title,
    durationMinutes: def.durationMinutes,
    passingScore: def.passingScore,
    instructions: def.instructions,
    tasks: def.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      prompt: task.prompt,
      responses: task.responses,
      questions: task.questions.map((q) =>
        q.kind === "choice"
          ? { id: q.id, kind: "choice", prompt: q.prompt, options: q.options, points: q.points }
          : {
              id: q.id,
              kind: "written",
              prompt: q.prompt,
              minWords: q.minWords,
              placeholder: q.placeholder,
              points: q.points,
            }
      ),
    })),
  };
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9$.¢%/]+/g) || [];
}

/** Rejects keyboard-mashing and copy-pasted filler. */
function looksLikeRealWriting(text: string): boolean {
  const tokens = words(text);
  if (tokens.length === 0) return false;
  const unique = new Set(tokens).size;
  if (unique / tokens.length < 0.45) return false; // heavy repetition
  const alphabetic = tokens.filter((t) => /^[a-z]+$/.test(t));
  const vowelled = alphabetic.filter((t) => /[aeiouy]/.test(t));
  if (alphabetic.length > 0 && vowelled.length / alphabetic.length < 0.8) return false; // gibberish
  const longest = Math.max(...tokens.map((t) => t.length));
  return longest <= 40;
}

function gradeWritten(q: WrittenQuestion, raw: string, responseTexts: string[]): QuestionResult {
  const text = (raw || "").trim();
  const count = words(text).length;
  if (count < q.minWords) {
    return {
      id: q.id,
      kind: "written",
      earned: 0,
      max: q.points,
      feedback: `Too short — ${count} of the required ${q.minWords} words.`,
    };
  }
  if (!looksLikeRealWriting(text)) {
    return {
      id: q.id,
      kind: "written",
      earned: 0,
      max: q.points,
      feedback: "This answer could not be graded because it doesn't read as a genuine explanation.",
    };
  }
  // Pasting a model response back as the justification earns nothing.
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const copied = responseTexts.some((r) => {
    const resp = r.toLowerCase().replace(/\s+/g, " ");
    return resp.length > 40 && (normalized.includes(resp) || resp.includes(normalized));
  });
  if (copied) {
    return {
      id: q.id,
      kind: "written",
      earned: 0,
      max: q.points,
      feedback: "This answer repeats a model response instead of evaluating it.",
    };
  }

  const missed: string[] = [];
  let matched = 0;
  for (const concept of q.concepts) {
    const hit = concept.patterns.some((p) => new RegExp(p, "i").test(text));
    if (hit) matched++;
    else missed.push(concept.label);
  }
  const earned = Math.round((q.points * matched) / q.concepts.length);
  return {
    id: q.id,
    kind: "written",
    earned,
    max: q.points,
    feedback:
      missed.length === 0
        ? "Covers all the key points."
        : `Covered ${matched} of ${q.concepts.length} key points. Missing: ${missed.join("; ")}.`,
  };
}

export function gradeAssessment(def: AssessmentDefinition, answers: AssessmentAnswers) {
  const results: QuestionResult[] = [];
  let earned = 0;
  let max = 0;
  let choiceCorrect = 0;
  let choiceTotal = 0;
  let writtenEarned = 0;
  let writtenMax = 0;

  for (const task of def.tasks) {
    const responseTexts = task.responses.map((r) => r.content);
    for (const q of task.questions) {
      max += q.points;
      if (q.kind === "choice") {
        choiceTotal++;
        const ok = q.correct.includes(String(answers[q.id] ?? ""));
        if (ok) choiceCorrect++;
        const pts = ok ? q.points : 0;
        earned += pts;
        results.push({ id: q.id, kind: "choice", earned: pts, max: q.points });
      } else {
        const r = gradeWritten(q, String(answers[q.id] ?? ""), responseTexts);
        earned += r.earned;
        writtenEarned += r.earned;
        writtenMax += q.points;
        results.push(r);
      }
    }
  }

  const score = max > 0 ? Math.round((earned / max) * 100) : 0;
  return {
    score,
    passed: score >= def.passingScore,
    choiceCorrect,
    choiceTotal,
    writtenEarned,
    writtenMax,
    questions: results,
  };
}
