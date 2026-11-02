"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { saveAvailability } from "@/actions/profile";
import { WEEKLY_HOURS_OPTIONS } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, ExternalLink, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AvailabilityTabProps {
  profile: Profile;
}

export function AvailabilityTab({ profile }: AvailabilityTabProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  const [weeklyHours, setWeeklyHours] = React.useState<number | null>(
    profile.weekly_hours ?? 10
  );
  const [linkedinUrl, setLinkedinUrl] = React.useState<string>(
    profile.linkedin_url || ""
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await saveAvailability({
      weekly_hours: weeklyHours,
      linkedin_url: linkedinUrl.trim() || undefined,
    });

    setLoading(false);

    if (res.error) {
      if (typeof res.error === "object") {
        const firstErr = Object.values(res.error)[0]?.[0] || "Validation failed.";
        toast.error("Could not save availability", { description: firstErr });
      } else {
        toast.error("Could not save availability", { description: res.error });
      }
    } else {
      setIsDirty(false);
      toast.success("Availability saved", {
        description: "Your weekly schedule and LinkedIn URL have been saved.",
      });
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Availability & Professional Links
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Specify how many hours per week you can dedicate to benchmark evaluation sprints.
          </p>
        </div>

        {/* Weekly Availability (#hours anchor) */}
        <div id="hours" className="space-y-3 scroll-mt-24">
          <Label className="text-xs font-semibold">
            Weekly Hours Commitment <span className="text-muted-foreground text-[10px]">(Select one)</span>
          </Label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WEEKLY_HOURS_OPTIONS.map((opt) => {
              const isSelected = weeklyHours === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setWeeklyHours(opt.value);
                    setIsDirty(true);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary shadow-2xs font-bold"
                      : "bg-background border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <div>
                    <span className="text-xs block">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ~{opt.value} hrs / week
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* LinkedIn Profile URL (#linkedin_url anchor) */}
        <div id="linkedin_url" className="space-y-1.5 pt-3 border-t border-border/60 scroll-mt-24">
          <Label htmlFor="input_linkedin" className="text-xs font-semibold">
            LinkedIn Profile URL <span className="text-muted-foreground text-[10px]">(Optional, must start with https://)</span>
          </Label>
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="input_linkedin"
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                setIsDirty(true);
              }}
              placeholder="https://linkedin.com/in/username"
              className="pl-9 text-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Enables reviewer team to verify employment history and peer network.
          </p>
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
            <span>Save Availability</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
