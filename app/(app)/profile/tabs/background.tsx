"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Profile, EducationItem, ExperienceItem } from "@/types";
import { parseEducation, parseExperience } from "@/lib/profile";
import { saveBackground } from "@/actions/profile";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap,
  Briefcase,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface BackgroundTabProps {
  profile: Profile;
}

export function BackgroundTab({ profile }: BackgroundTabProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  // Education repeater
  const [education, setEducation] = React.useState<EducationItem[]>(
    parseEducation(profile.education)
  );
  const [showAddEdu, setShowAddEdu] = React.useState(false);
  const [newEdu, setNewEdu] = React.useState<EducationItem>({
    school: "",
    degree: "",
    field: "",
    year: new Date().getFullYear(),
  });

  // Experience repeater
  const [experience, setExperience] = React.useState<ExperienceItem[]>(
    parseExperience(profile.experience)
  );
  const [showAddExp, setShowAddExp] = React.useState(false);
  const [newExp, setNewExp] = React.useState<ExperienceItem>({
    company: "",
    title: "",
    from: "",
    to: "",
    summary: "",
  });

  const handleAddEducation = () => {
    if (!newEdu.school.trim() || !newEdu.degree.trim()) {
      toast.error("Please specify both school/institution and degree.");
      return;
    }
    setEducation([...education, { ...newEdu }]);
    setNewEdu({
      school: "",
      degree: "",
      field: "",
      year: new Date().getFullYear(),
    });
    setShowAddEdu(false);
    setIsDirty(true);
  };

  const handleRemoveEducation = (index: number) => {
    setEducation(education.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  const handleAddExperience = () => {
    if (!newExp.company.trim() || !newExp.title.trim()) {
      toast.error("Please specify company/organization and job title.");
      return;
    }
    setExperience([...experience, { ...newExp }]);
    setNewExp({ company: "", title: "", from: "", to: "", summary: "" });
    setShowAddExp(false);
    setIsDirty(true);
  };

  const handleRemoveExperience = (index: number) => {
    setExperience(experience.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await saveBackground({
      education,
      experience,
    });

    setLoading(false);

    if (res.error) {
      if (typeof res.error === "object") {
        const firstErr = Object.values(res.error)[0]?.[0] || "Validation failed.";
        toast.error("Could not save background", { description: firstErr });
      } else {
        toast.error("Could not save background", { description: res.error });
      }
    } else {
      setIsDirty(false);
      toast.success("Background saved", {
        description: "Your education and experience credentials have been updated.",
      });
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Academic & Professional Background
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add past academic credentials and clinical or industrial roles.
          </p>
        </div>

        {/* Education Repeater (#education anchor) */}
        <div id="education" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                Education & Degrees <span className="text-muted-foreground text-[10px]">(1 or more for completeness)</span>
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Institutions, degrees, fields of study, and graduation years.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddEdu(true)}
              className="text-xs font-semibold gap-1 h-8 rounded-full"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Degree</span>
            </Button>
          </div>

          {/* Education Rows List */}
          {education.length > 0 ? (
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-start justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {edu.degree} {edu.field && `in ${edu.field}`}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {edu.school} {edu.year && `• Class of ${edu.year}`}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEducation(idx)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No education credentials added yet. Click &ldquo;Add Degree&rdquo; to input credentials.
            </div>
          )}

          {/* Add Education Box */}
          {showAddEdu && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 mt-2 animate-in fade-in-0 duration-150">
              <h4 className="text-xs font-bold text-foreground">Add Degree Entry</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">School / University *</Label>
                  <Input
                    placeholder="e.g. University of Nairobi / Harvard"
                    value={newEdu.school}
                    onChange={(e) => setNewEdu({ ...newEdu, school: e.target.value })}
                    className="text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Degree *</Label>
                  <Input
                    placeholder="e.g. B.S., M.D., Ph.D."
                    value={newEdu.degree}
                    onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                    className="text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Field of Study</Label>
                  <Input
                    placeholder="e.g. Computer Science & AI"
                    value={newEdu.field || ""}
                    onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Graduation Year</Label>
                  <Input
                    type="number"
                    min={1950}
                    max={new Date().getFullYear() + 6}
                    value={newEdu.year || ""}
                    onChange={(e) => setNewEdu({ ...newEdu, year: Number(e.target.value) || "" })}
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddEdu(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddEducation}
                  className="text-xs h-8 font-semibold"
                >
                  Add Degree
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Experience Repeater (#experience anchor) */}
        <div id="experience" className="space-y-3 pt-3 border-t border-border/60 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                Work Experience <span className="text-muted-foreground text-[10px]">(1 or more for completeness)</span>
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Clinical, industry, academic, or research experience.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddExp(true)}
              className="text-xs font-semibold gap-1 h-8 rounded-full"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Role</span>
            </Button>
          </div>

          {/* Experience Rows List */}
          {experience.length > 0 ? (
            <div className="space-y-2">
              {experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground">
                      {exp.title}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium">
                      {exp.company}{" "}
                      {(exp.from || exp.to) &&
                        `• ${exp.from || ""} – ${exp.to || "Present"}`}
                    </p>
                    {exp.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                        {exp.summary}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveExperience(idx)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No work experience added yet. Click &ldquo;Add Role&rdquo; to input experience.
            </div>
          )}

          {/* Add Experience Box */}
          {showAddExp && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 mt-2 animate-in fade-in-0 duration-150">
              <h4 className="text-xs font-bold text-foreground">Add Experience Role</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Company / Organization *</Label>
                  <Input
                    placeholder="e.g. DeepMind / Mayo Clinic"
                    value={newExp.company}
                    onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                    className="text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Job Title / Role *</Label>
                  <Input
                    placeholder="e.g. Senior Research Scientist"
                    value={newExp.title}
                    onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                    className="text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">From Year / Date *</Label>
                  <Input
                    placeholder="e.g. 2021"
                    value={newExp.from || ""}
                    onChange={(e) => setNewExp({ ...newExp, from: e.target.value })}
                    className="text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">To Year / Date</Label>
                  <Input
                    placeholder="e.g. Present / 2024"
                    value={newExp.to || ""}
                    onChange={(e) => setNewExp({ ...newExp, to: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold">Role Summary (Max 400 chars)</Label>
                  <Textarea
                    placeholder="Summarize key responsibilities, published papers, or technical scope..."
                    value={newExp.summary || ""}
                    onChange={(e) => setNewExp({ ...newExp, summary: e.target.value })}
                    className="text-xs bg-background"
                    maxLength={400}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddExp(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddExperience}
                  className="text-xs h-8 font-semibold"
                >
                  Add Role
                </Button>
              </div>
            </div>
          )}
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
            <span>Save Background</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
