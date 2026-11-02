import type { Profile, EducationItem, ExperienceItem } from "@/types";

/**
 * Safely parses education JSON from profile
 */
export function parseEducation(education: unknown): EducationItem[] {
  if (!education) return [];
  if (Array.isArray(education)) return education as EducationItem[];
  if (typeof education === "string") {
    try {
      const parsed = JSON.parse(education);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Safely parses experience JSON from profile
 */
export function parseExperience(experience: unknown): ExperienceItem[] {
  if (!experience) return [];
  if (Array.isArray(experience)) return experience as ExperienceItem[];
  if (typeof experience === "string") {
    try {
      const parsed = JSON.parse(experience);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const CHECKS = [
  {
    key: "full_name",
    label: "Add your full name",
    tab: "basics",
    pts: 10,
    ok: (p: Profile) => !!p.full_name?.trim(),
  },
  {
    key: "headline",
    label: "Write a short headline",
    tab: "basics",
    pts: 10,
    ok: (p: Profile) => !!p.headline?.trim(),
  },
  {
    key: "country",
    label: "Select your country",
    tab: "basics",
    pts: 5,
    ok: (p: Profile) => !!p.country,
  },
  {
    key: "expertise",
    label: "Choose your primary expertise",
    tab: "expertise",
    pts: 15,
    ok: (p: Profile) => !!p.expertise,
  },
  {
    key: "bio",
    label: "Write a bio (50+ characters)",
    tab: "basics",
    pts: 15,
    ok: (p: Profile) => (p.bio?.trim().length ?? 0) >= 50,
  },
  {
    key: "skills",
    label: "Add at least 3 skills",
    tab: "expertise",
    pts: 15,
    ok: (p: Profile) => (p.skills?.length ?? 0) >= 3,
  },
  {
    key: "languages",
    label: "Add a language",
    tab: "expertise",
    pts: 5,
    ok: (p: Profile) => (p.languages?.length ?? 0) >= 1,
  },
  {
    key: "education",
    label: "Add your education",
    tab: "background",
    pts: 10,
    ok: (p: Profile) => parseEducation(p.education).length >= 1,
  },
  {
    key: "experience",
    label: "Add work experience",
    tab: "background",
    pts: 10,
    ok: (p: Profile) => parseExperience(p.experience).length >= 1,
  },
  {
    key: "hours",
    label: "Set your weekly availability",
    tab: "availability",
    pts: 5,
    ok: (p: Profile) => !!p.weekly_hours,
  },
];

export interface MissingProfileItem {
  key: string;
  label: string;
  tab: string;
  href: string;
}

export interface ProfileCompletenessResult {
  score: number;
  percentage: number; // alias for score
  completedCount: number;
  totalCount: number;
  missing: MissingProfileItem[];
  missingFields: MissingProfileItem[]; // alias for compatibility
  isComplete: boolean;
  canApply: boolean;
}

export function profileCompleteness(p: Profile | null | undefined): ProfileCompletenessResult {
  if (!p) {
    const allMissing = CHECKS.map(({ key, label, tab }) => ({
      key,
      label,
      tab,
      href: `/profile?tab=${tab}#${key}`,
    }));
    return {
      score: 0,
      percentage: 0,
      completedCount: 0,
      totalCount: CHECKS.length,
      missing: allMissing,
      missingFields: allMissing,
      isComplete: false,
      canApply: false,
    };
  }

  const done = CHECKS.filter((c) => c.ok(p));
  const missing = CHECKS.filter((c) => !c.ok(p)).map(({ key, label, tab }) => ({
    key,
    label,
    tab,
    href: `/profile?tab=${tab}#${key}`,
  }));

  const score = done.reduce((s, c) => s + c.pts, 0);

  return {
    score,
    percentage: score,
    completedCount: done.length,
    totalCount: CHECKS.length,
    missing,
    missingFields: missing,
    isComplete: score === 100,
    canApply: score >= 50,
  };
}

// Compatibility alias
export const getProfileCompleteness = profileCompleteness;
