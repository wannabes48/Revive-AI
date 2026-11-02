/**
 * Platform Constants
 * Shared across contributor profiles, task forms, search filters, and matching.
 */

export const CATEGORIES = [
  "Software Engineering",
  "Healthcare",
  "Legal",
  "Finance",
  "AI Alignment & Safety",
  "Biochemical & Genetics",
  "Writing",
  "STEM",
  "Languages",
  "Education",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MIN_PROFILE_TO_APPLY = 50; // set to 0 to disable gating

export const TIMEZONES = [
  "UTC",
  "America/New_York (EST/EDT)",
  "America/Chicago (CST/CDT)",
  "America/Denver (MST/MDT)",
  "America/Los_Angeles (PST/PDT)",
  "Europe/London (GMT/BST)",
  "Europe/Paris (CET/CEST)",
  "Europe/Berlin (CET/CEST)",
  "Asia/Dubai (GST)",
  "Asia/Kolkata (IST)",
  "Asia/Singapore (SGT)",
  "Asia/Tokyo (JST)",
  "Africa/Nairobi (EAT)",
  "Australia/Sydney (AEST/AEDT)",
] as const;

export const COUNTRIES = [
  "Kenya",
  "United States",
  "Canada",
  "Argentina",
  "Australia",
  "Brazil",
  "Egypt",
  "France",
  "Germany",
  "Ghana",
  "India",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Mexico",
  "Netherlands",
  "Nigeria",
  "Rwanda",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Arab Emirates",
  "United Kingdom",
] as const;

export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin Chinese",
  "French",
  "German",
  "Japanese",
  "Arabic",
  "Portuguese",
  "Russian",
  "Hindi",
  "Korean",
  "Italian",
  "Swahili",
] as const;

export const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Software Engineering": [
    "TypeScript",
    "Python",
    "Rust",
    "Go",
    "React / Next.js",
    "System Architecture",
    "LLM Integration",
    "Prompt Engineering",
    "Code Review",
    "API Design",
  ],
  Healthcare: [
    "Clinical Medicine",
    "Oncology",
    "Pharmacology",
    "Biomedical Research",
    "Medical Coding (ICD-10)",
    "Genetics",
    "Patient Case Studies",
    "Diagnostic Reasoning",
  ],
  Writing: [
    "Technical Writing",
    "Copywriting",
    "Content Strategy",
    "Fact-Checking",
    "Proofreading",
    "Creative Fiction",
    "Scientific Publishing",
    "Translation",
  ],
  STEM: [
    "Mathematics",
    "Physics",
    "Data Science",
    "Statistics",
    "Chemistry",
    "Machine Learning",
    "Quantitative Analysis",
    "Simulation Modeling",
  ],
  Legal: [
    "Corporate Law",
    "Contract Review",
    "Intellectual Property",
    "Regulatory Compliance",
    "Litigation Strategy",
    "Tax Law",
    "Data Privacy (GDPR)",
  ],
  Languages: [
    "Translation",
    "Localization",
    "Linguistics",
    "NLP Corpus Annotation",
    "Bilingual Fluency",
    "Dialect Analysis",
    "Grammar Evaluation",
  ],
  Finance: [
    "Financial Modeling",
    "Corporate Accounting",
    "Risk Assessment",
    "Valuation",
    "Investment Analysis",
    "Quantitative Trading",
    "Tax Compliance",
  ],
  "AI Alignment & Safety": [
    "Constitutional AI",
    "RLHF",
    "Adversarial Prompting",
    "Jailbreak Probes",
    "Model Evaluation",
    "Safety Guardrails",
    "Bias Mitigation",
  ],
  "Biochemical & Genetics": [
    "CRISPR/Cas9",
    "Synthetic Biology",
    "Genomics",
    "Molecular Biology",
    "BSL-2 Protocols",
    "Recombinant DNA",
    "Biochemistry",
  ],
  Education: [
    "Curriculum Design",
    "Pedagogy",
    "Assessment Design",
    "STEM Tutoring",
    "Instructional Design",
    "Educational Psychology",
  ],
  Other: [
    "Product Management",
    "Operations",
    "Project Management",
    "User Research",
    "Data Annotation",
    "Quality Assurance",
  ],
};

export const COMMON_SKILLS = [
  "Python",
  "TypeScript",
  "Clinical Oncology",
  "Corporate Law",
  "RLHF Annotation",
  "Fact-Checking",
  "Financial Modeling",
  "Translation",
  "Statistical Inference",
  "Prompt Engineering",
  "Mathematics",
  "Contract Review",
] as const;

export const WEEKLY_HOURS_OPTIONS = [
  { value: 5, label: "5 hrs/week" },
  { value: 10, label: "10 hrs/week" },
  { value: 15, label: "15 hrs/week" },
  { value: 20, label: "20 hrs/week" },
  { value: 30, label: "30 hrs/week" },
  { value: 40, label: "40+ hrs/week" },
] as const;

export const PAY_UNITS = [
  { value: "hour", label: "Per Hour (/hr)" },
  { value: "task", label: "Per Completed Task" },
  { value: "milestone", label: "Per Benchmark Milestone" },
  { value: "project", label: "Fixed Project Total" },
] as const;

// Payout & Ledger Constants
export const MIN_PAYOUT_CENTS = 2500; // $25.00 minimum withdrawal
export const HOLD_DAYS = 7;           // 7 days hold period before earnings become available
export const FX_USD_KES = 129;         // Estimated USD to KES FX rate for display
