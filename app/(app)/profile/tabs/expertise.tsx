"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { saveExpertise } from "@/actions/profile";
import { CATEGORIES, COMMON_LANGUAGES, SKILLS_BY_CATEGORY } from "@/lib/constants";
import { TagInput } from "@/components/app/tag-input";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface ExpertiseTabProps {
  profile: Profile;
}

export function ExpertiseTab({ profile }: ExpertiseTabProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  const [expertise, setExpertise] = React.useState<string>(profile.expertise || "");
  const [skills, setSkills] = React.useState<string[]>(profile.skills || []);
  const [languages, setLanguages] = React.useState<string[]>(
    profile.languages && profile.languages.length > 0 ? profile.languages : ["English"]
  );

  const currentCategorySuggestions = React.useMemo(() => {
    if (!expertise) return [];
    return SKILLS_BY_CATEGORY[expertise] || [];
  }, [expertise]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertise) {
      toast.error("Please choose a primary expertise category.");
      return;
    }

    setLoading(true);

    const res = await saveExpertise({
      expertise,
      skills,
      languages,
    });

    setLoading(false);

    if (res.error) {
      if (typeof res.error === "object") {
        const firstErr = Object.values(res.error)[0]?.[0] || "Validation failed.";
        toast.error("Could not save expertise", { description: firstErr });
      } else {
        toast.error("Could not save expertise", { description: res.error });
      }
    } else {
      setIsDirty(false);
      toast.success("Expertise saved", {
        description: "Your category, skills, and languages have been updated.",
      });
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Specialization & Domain Skills
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Matching algorithms prioritize tasks aligned with your primary category and verified skill tags.
          </p>
        </div>

        {/* Primary Expertise (#expertise anchor) */}
        <div id="expertise" className="space-y-2.5 scroll-mt-24">
          <Label className="text-xs font-semibold">
            Primary Expertise Category <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = expertise === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setExpertise(cat);
                    setIsDirty(true);
                  }}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between min-h-[44px] touch-target ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary shadow-2xs font-bold"
                      : "bg-background border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <span>{cat}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Domain Skills Tag Input (#skills anchor) */}
        <div id="skills" className="space-y-2 pt-3 border-t border-border/60 scroll-mt-24">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Domain Skills <span className="text-muted-foreground text-[10px]">(3 or more for completeness)</span>
            </Label>
            <span
              className={`text-[11px] font-semibold ${
                skills.length >= 3 ? "text-primary" : "text-amber-600"
              }`}
            >
              {skills.length >= 3 ? "✓ 3+ skills added" : `${skills.length}/3 minimum`}
            </span>
          </div>

          <TagInput
            value={skills}
            onChange={(newSkills) => {
              setSkills(newSkills);
              setIsDirty(true);
            }}
            suggestions={currentCategorySuggestions}
            maxTags={20}
            placeholder="Type skill and press Enter or comma..."
          />
        </div>

        {/* Working Languages (#languages anchor) */}
        <div id="languages" className="space-y-2 pt-3 border-t border-border/60 scroll-mt-24">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Working Languages <span className="text-muted-foreground text-[10px]">(1 or more for completeness)</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Max 10 languages
            </span>
          </div>

          <TagInput
            value={languages}
            onChange={(newLanguages) => {
              setLanguages(newLanguages);
              setIsDirty(true);
            }}
            suggestions={COMMON_LANGUAGES as unknown as string[]}
            maxTags={10}
            placeholder="Type language and press Enter..."
          />
        </div>

        {/* Tab Save Bar */}
        <div className="sticky bottom-0 inset-x-0 z-20 -mx-6 -mb-6 p-4 sm:p-0 sm:mx-0 sm:mb-0 bg-card/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-border/70 pb-safe flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isDirty && (
              <span className="text-amber-600 font-semibold inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Unsaved changes
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="rounded-full text-xs font-bold gap-1.5 h-11 min-h-[44px] touch-target px-6 shadow-2xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Expertise</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
