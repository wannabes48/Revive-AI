// Wording for "AI Response Evaluation: Python Code Review" (slug code-review-python).
// Each work item's payload has: prompt (the coding scenario), response_a, response_b (candidate code).
// The structure comes from build-pairwise-form.ts. To change the live task, edit this file and run:
//   npx tsx --env-file=.env.local scripts/seed-python-code-review-task.ts
import { buildPairwiseForm, type PairwiseConfig, type Question } from "./build-pairwise-form";

const SCALE_LABELS = ["Very poor", "Poor", "Adequate / Mixed", "Strong", "Excellent"];
const SCALE_MEANINGS = [
  "Fundamentally broken, insecure, or does not address the requirements.",
  "Major defects, unsafe behaviour, or substantial failures on normal inputs.",
  "Works on the main path, but has meaningful gaps, unhandled cases, or weak design.",
  "Correct and sound; only minor issues that would not block a code review.",
  "Correct, secure, efficient, idiomatic, and ready to merge as written.",
];

const INSTRUCTIONS_MD = `## Instructions for evaluators

- Each case gives a coding scenario and two candidate solutions written for Python 3.11. Evaluate Candidate A and Candidate B independently before completing the comparison section.
- Read the code as a reviewer would: trace it on normal, boundary and hostile inputs. Do not assume a candidate is correct because it is longer, more elaborate, or more confident.
- Score each rating criterion from 1 to 5 using the scale below. Judge the criterion itself, not formatting or comment volume alone.
- Use the text fields to quote the exact lines at fault, explain the consequence, and give the fix. Propose at least three concrete tests for each candidate.
- Correctness and security come first. A serious defect must not be hidden by a high score in other dimensions.
- If the scenario leaves a requirement ambiguous, state the assumption you made rather than inventing one silently.

## Common rating scale

| Score | Performance level | General standard |
|---|---|---|
${SCALE_LABELS.map((l, i) => ({ score: i + 1, l, m: SCALE_MEANINGS[i] }))
  .reverse()
  .map((r) => `| ${r.score} | ${r.l} | ${r.m} |`)
  .join("\n")}
`;

const DIMENSIONS: (Question & { compare: string })[] = [
  { id: "requirements", label: "Requirements Coverage",
    help: "Does the code do what the scenario asks, all of it? Check every stated requirement and constraint (inputs, outputs, limits, error behaviour). Penalize code that solves a different or easier problem, or silently drops a requirement.",
    compare: "Which candidate meets more of the stated requirements, more faithfully?" },
  { id: "correctness", label: "Functional Correctness",
    help: "Trace the code on representative inputs. Check logic errors, off-by-one mistakes, wrong return values or types, mutation of inputs, ordering and stability assumptions, and behaviour that differs from the docstring or the scenario.",
    compare: "Which candidate produces correct results on normal inputs more reliably?" },
  { id: "edge_cases", label: "Edge Cases & Robustness",
    help: "Check empty, single-element, very large, duplicate, None, Unicode, malformed and concurrent inputs as relevant to the scenario. Does the code handle failures (I/O errors, timeouts, partial writes) explicitly and leave state consistent?",
    compare: "Which candidate handles boundary, malformed and failure cases better?" },
  { id: "security", label: "Security & Safety",
    help: "Check injection, path traversal, unsafe deserialization, resource exhaustion, secrets in code or logs, unchecked external input, race conditions and unsafe defaults. A single exploitable flaw should cap this score low.",
    compare: "Which candidate is less exposed to security and data-safety problems?" },
  { id: "efficiency", label: "Time & Space Complexity",
    help: "State the time and space complexity. Is it appropriate for the expected input size? Penalize avoidable quadratic work, unbounded memory, repeated I/O in loops, and premature optimization that hurts correctness.",
    compare: "Which candidate has the more appropriate time and space complexity?" },
  { id: "readability", label: "Readability & Idiomatic Python",
    help: "Is the code clear to a Python 3.11 developer? Check naming, structure, use of the standard library, type hints where useful, and idioms (context managers, comprehensions, pathlib). Style matters only where it affects understanding or correctness.",
    compare: "Which candidate is clearer and more idiomatic to read and review?" },
  { id: "maintainability", label: "Design & Maintainability",
    help: "Is the code easy to extend, test and debug? Check separation of concerns, hidden global state, hard-coded values, error messages, and whether a future change would be risky.",
    compare: "Which candidate would be easier and safer to maintain and extend?" },
  { id: "testability", label: "Testability & Verification",
    help: "Could this code be tested in isolation, and does it make its contracts clear (inputs, outputs, exceptions)? Credit code that includes or enables meaningful tests; penalize code whose behaviour cannot be checked without heavy mocking.",
    compare: "Which candidate is easier to verify with meaningful tests?" },
];

const TIE_HELP = "Choose a tie if there is no meaningful difference on this dimension.";

export const pythonCodeReviewConfig: PairwiseConfig = {
  key: "python-code-review",
  name: "Python code review",
  instructions: INSTRUCTIONS_MD,

  scale: { labels: SCALE_LABELS, meanings: SCALE_MEANINGS },

  groups: { ratings: "A. Code quality ratings" },

  dimensions: DIMENSIONS.map(({ id, label, help }) => ({ id, label, help })),

  classification: [
    {
      id: "primary_defect",
      label: "Primary Defect Classification",
      help: "Select the single most consequential defect in this candidate. Choose 'No material defect' if none is present. Record any further defects in the written assessment.",
      options: [
        "No material defect / Correct",
        "Logic error / wrong result",
        "Missed requirement",
        "Unhandled edge case or input",
        "Crash or unhandled exception",
        "Security vulnerability",
        "Resource leak or unbounded resource use",
        "Concurrency or race condition",
        "Inefficient algorithm for the expected input size",
        "Incorrect API or library usage",
        "Data loss or corruption",
        "Misleading or wrong documentation / comments",
        "Other",
      ],
    },
    {
      id: "defect_severity",
      label: "Defect Severity",
      help: "Select the highest plausible impact if this code were merged and run in production. Consider both likelihood and consequence. Select 'Not applicable' when no meaningful failure path is identified.",
      options: [
        "Not applicable — no meaningful failure identified",
        "Trivial — cosmetic or style only",
        "Minor — wrong in rare cases with an easy workaround",
        "Moderate — wrong results or crashes on realistic inputs",
        "Major — data loss, security exposure, or outage in normal use",
        "Critical — exploitable vulnerability or silent corruption at scale",
      ],
    },
    {
      id: "defect_extent",
      label: "Defect Extent",
      help: "How much of the candidate is affected by material defects?",
      options: [
        "No material defects",
        "One isolated minor issue",
        "Several minor issues",
        "One major issue",
        "Multiple major issues",
        "Fundamentally broken or unsafe",
      ],
    },
    {
      id: "production_risk",
      label: "Unsafe to Merge",
      help: "Would merging this code as written, without further changes, plausibly cause incorrect results, a crash, a security exposure, or data loss in production?",
    },
  ],

  consistency: {
    errorType: "primary_defect",
    errorExtent: "defect_extent",
    harmSeverity: "defect_severity",
    harm: "production_risk",
    safetyDimension: "security",
  },

  written: [
    { id: "critique", label: "Detailed Code Review & Rationale",
      help: "Explain your scores as a reviewer would. Start with what the candidate gets right, then walk through each important defect, risky assumption and omission, and why it matters for this scenario. Refer to specific lines or functions rather than general statements." },
    { id: "defects", label: "Specific Defects & Evidence",
      help: "List each defect separately. Quote or name the exact line(s), give an input that triggers the problem, state the actual versus expected behaviour, and explain the cause. If no material defect exists, say so and explain how you verified it." },
    { id: "tests", label: "Proposed Tests",
      help: "Propose at least three concrete tests (input and expected result) that would expose this candidate's defects or confirm its correctness. Include at least one boundary case and one failure or hostile-input case." },
    { id: "complexity", label: "Complexity Analysis",
      help: "State the time and space complexity in Big-O with a one-line justification for each. Note the dominant operation and whether it is acceptable for the input sizes the scenario implies." },
    { id: "corrected", label: "Corrected Code / Required Changes",
      help: "Describe or write the minimum changes needed to make this candidate correct and safe, in order of importance. Short code snippets are welcome. If the candidate is already acceptable, explain why no substantive change is needed." },
    { id: "strengths", label: "Strengths Worth Preserving",
      help: "Identify specific correct, efficient, secure or well-structured elements that should be kept. Do not give generic praise; cite the code and explain its value." },
  ],

  comparison: {
    preferred: {
      id: "preferred", label: "Overall Preferred Candidate",
      options: ["Response A", "Response B", "Tie — Equivalent overall", "Neither — Both unacceptable"],
      help: "After completing both independent evaluations, select the candidate you would rather merge for this scenario. Weigh correctness and security first; do not choose based on length, comments, or apparent sophistication alone.",
    },
    tieOptions: ["Response A", "Response B", "Tie — No meaningful difference"],
    // One comparison per rating dimension, in the same order.
    dimensions: DIMENSIONS.map(({ id, label, compare }) => ({ id, label, help: `${compare} ${TIE_HELP}` })),
    confidence: {
      id: "confidence", label: "Confidence in Overall Decision",
      scaleLabels: ["Very uncertain", "Low confidence", "Moderately confident", "Confident", "Very confident"],
      help: "Rate confidence that the selected candidate is genuinely better for this scenario. 1 = very uncertain; 5 = very confident. Lower confidence should come with a clear explanation of what is ambiguous or untested.",
    },
    safetyOverride: {
      id: "safety_override", label: "Security / Correctness Override",
      options: ["No override needed", "Response A has a serious defect", "Response B has a serious defect",
                "Both responses have serious defects", "Cannot determine from available information"],
      help: "Does either candidate contain a serious correctness or security defect that should override a higher aggregate score or more polished code?",
    },
    written: [
      { id: "rationale", label: "Detailed Head-to-Head Rationale",
        help: "Explain why the selected candidate is preferable. Compare concrete code from A and B, describe the most important differences in correctness and security, and explain why they matter for this scenario. If tied or neither is acceptable, justify that decision explicitly." },
      { id: "tradeoffs", label: "Strengths, Weaknesses & Trade-offs",
        help: "Summarize the most important strength and weakness of each candidate. Identify any trade-off (for example, one is faster but mishandles malformed input). Explain why the trade-off does or does not change the overall decision." },
      { id: "change", label: "What Would Change the Decision?",
        help: "State what specific fix, clarified requirement, or test result could change the selected candidate. If no realistic change would alter the decision, explain why." },
      { id: "verdict", label: "Final Review Verdict",
        help: "Write a concise verdict suitable for quality review. State the preferred candidate, the decisive reason, any blocking defect, and whether either candidate could be merged without revision." },
    ],
  },

  signoff: { label: "Review status", options: ["Complete", "Requires senior review"] },

  text: { minLength: 20, maxLength: 3000 },

  // Same hold and credit cap the task already uses.
  timing: { claim_minutes: 60, max_credited_seconds_per_item: 3600 },
};

export const PYTHON_CODE_REVIEW_TASK_FORM = buildPairwiseForm(pythonCodeReviewConfig);
