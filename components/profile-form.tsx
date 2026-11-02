"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Profile, EducationItem, ExperienceItem } from "@/lib/supabase/types";
import { updateProfile } from "@/actions/profile";
import { parseEducation, parseExperience, getProfileCompleteness } from "@/lib/profile";
import {
  CATEGORIES,
  TIMEZONES,
  COMMON_LANGUAGES,
  COMMON_SKILLS,
  WEEKLY_HOURS_OPTIONS,
} from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Sparkles,
  GraduationCap,
  Clock,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Briefcase,
  Globe,
  Phone,
  Mail,
  Camera,
  Layers,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

interface ProfileFormProps {
  profile: Profile;
  initialTab?: string;
}

type TabKey = "basics" | "expertise" | "background" | "availability" | "account";

export function ProfileForm({ profile, initialTab }: ProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active tab state synced with URL ?tab=
  const urlTab = (searchParams.get("tab") as TabKey) || (initialTab as TabKey) || "basics";
  const [activeTab, setActiveTab] = React.useState<TabKey>(urlTab);

  React.useEffect(() => {
    const t = searchParams.get("tab") as TabKey;
    if (t && ["basics", "expertise", "background", "availability", "account"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Form states
  const [loading, setLoading] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name || "");
  const [headline, setHeadline] = React.useState(profile.headline || "");
  const [phone, setPhone] = React.useState(profile.phone || "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url || "");
  
  // Expertise
  const [expertise, setExpertise] = React.useState(profile.expertise || "");
  const [skills, setSkills] = React.useState<string[]>(profile.skills || []);
  const [newSkillInput, setNewSkillInput] = React.useState("");
  const [languages, setLanguages] = React.useState<string[]>(
    profile.languages && profile.languages.length > 0 ? profile.languages : ["English"]
  );
  const [newLanguageInput, setNewLanguageInput] = React.useState("");

  // Background
  const [bio, setBio] = React.useState(profile.bio || "");
  const [linkedinUrl, setLinkedinUrl] = React.useState(profile.linkedin_url || "");
  const [education, setEducation] = React.useState<EducationItem[]>(
    parseEducation(profile.education)
  );
  const [experience, setExperience] = React.useState<ExperienceItem[]>(
    parseExperience(profile.experience)
  );

  // New Education item draft
  const [newEdu, setNewEdu] = React.useState<EducationItem>({
    school: "",
    degree: "",
    field: "",
    year: "",
  });
  const [showAddEdu, setShowAddEdu] = React.useState(false);

  // New Experience item draft
  const [newExp, setNewExp] = React.useState<ExperienceItem>({
    company: "",
    title: "",
    from: "",
    to: "",
    summary: "",
  });
  const [showAddExp, setShowAddExp] = React.useState(false);

  // Availability
  const [country, setCountry] = React.useState(profile.country || "");
  const [timezone, setTimezone] = React.useState(profile.timezone || "America/New_York (EST/EDT)");
  const [weeklyHours, setWeeklyHours] = React.useState<number>(
    profile.weekly_hours || 10
  );

  // Profile completeness live calculation
  const currentProfileState: Profile = {
    ...profile,
    full_name: fullName,
    headline,
    phone,
    avatar_url: avatarUrl,
    expertise,
    skills,
    languages,
    bio,
    linkedin_url: linkedinUrl,
    education,
    experience,
    country,
    timezone,
    weekly_hours: weeklyHours,
  };
  const completeness = getProfileCompleteness(currentProfileState);

  // Skill management
  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const addCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkillInput("");
    }
  };

  // Language management
  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const addCustomLanguage = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newLanguageInput.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
      setNewLanguageInput("");
    }
  };

  // Education management
  const handleAddEducation = () => {
    if (!newEdu.school.trim() || !newEdu.degree.trim()) {
      toast.error("Missing fields", {
        description: "Please specify both institution name and degree.",
      });
      return;
    }
    setEducation([...education, { ...newEdu }]);
    setNewEdu({ school: "", degree: "", field: "", year: "" });
    setShowAddEdu(false);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  // Experience management
  const handleAddExperience = () => {
    if (!newExp.company.trim() || !newExp.title.trim()) {
      toast.error("Missing fields", {
        description: "Please specify company name and job title.",
      });
      return;
    }
    setExperience([...experience, { ...newExp }]);
    setNewExp({ company: "", title: "", from: "", to: "", summary: "" });
    setShowAddExp(false);
  };

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  // Submit all profile changes
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      full_name: fullName.trim(),
      headline: headline.trim() || null,
      phone: phone.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      country: country.trim(),
      expertise: expertise.trim(),
      timezone: timezone || null,
      weekly_hours: weeklyHours || null,
      linkedin_url: linkedinUrl.trim() || null,
      bio: bio.trim() || null,
      skills,
      languages,
      education,
      experience,
    };

    const res = await updateProfile(payload);
    setLoading(false);

    if (res.error) {
      const errMsg =
        typeof res.error === "string"
          ? res.error
          : Object.values(res.error)[0]?.[0] || "Validation failed";
      toast.error("Failed to update profile", {
        description: errMsg,
      });
    } else {
      toast.success("Profile updated", {
        description: "Your credentials and availability have been saved.",
      });
      router.refresh();
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "basics", label: "Basics", icon: User },
    { key: "expertise", label: "Expertise", icon: Sparkles },
    { key: "background", label: "Background", icon: GraduationCap },
    { key: "availability", label: "Availability", icon: Clock },
    { key: "account", label: "Account", icon: Shield },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Overview Card & Completeness Gauge */}
      <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-heading font-extrabold text-xl shadow-2xs">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Contributor"}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl("")}
                  />
                ) : (
                  <span>
                    {(fullName || profile.email || "C").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-bold text-foreground truncate">
                  {fullName || "Domain Expert"}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  {profile.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {headline || expertise || "Complete your profile to qualify for tasks"}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-2">
                <span>{profile.email}</span>
                {country && <span>• {country}</span>}
              </p>
            </div>
          </div>

          {/* Completeness Badge */}
          <div className="sm:text-right shrink-0 bg-muted/40 p-3 rounded-xl border border-border/60">
            <div className="flex items-center sm:justify-end gap-2 mb-1">
              <span className="text-xs font-bold text-foreground">
                Profile Completeness
              </span>
              <span className="font-mono text-xs font-bold text-primary">
                {completeness.percentage}%
              </span>
            </div>
            <div className="w-full sm:w-44 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {completeness.completedCount} of {completeness.totalCount} sections filled
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/70 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Basics */}
      {activeTab === "basics" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Personal Information
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Basic identification details presented to review coordinators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs font-semibold">
                Full Legal Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Jordan Hayes"
                  className="pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="headline" className="text-xs font-semibold">
                Professional Headline
              </Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Senior Clinical Oncologist & Biomedical AI Evaluator"
                maxLength={160}
                className="text-xs"
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>A concise summary displayed beside your name.</span>
                <span>{headline.length}/160</span>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="avatar_url" className="text-xs font-semibold">
                Avatar Image URL
              </Label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="avatar_url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="pl-9 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Direct link to your hosted headshot image (PNG, JPG, WebP).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expertise */}
      {activeTab === "expertise" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Domain Expertise & Specialization
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used by the automated evaluation matching pipeline to suggest fitting tasks.
            </p>
          </div>

          {/* Primary Category */}
          <div className="space-y-2">
            <Label htmlFor="expertise" className="text-xs font-semibold">
              Primary Field / Category <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = expertise === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExpertise(cat)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-2xs"
                        : "bg-card border-border hover:border-primary/40 text-foreground"
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2">
              <Input
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="Or specify custom primary field (e.g. Quantitative High-Frequency Risk)"
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Domain Skills */}
          <div className="space-y-3 pt-3 border-t border-border/70">
            <div>
              <Label className="text-xs font-semibold">
                Domain Skills & Capabilities
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Select your key capabilities or add custom tags.
              </p>
            </div>

            {/* Selected skills */}
            <div className="flex flex-wrap gap-2 min-h-8">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="hover:text-destructive cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No skills selected yet. Choose from below or type custom skills.
                </span>
              )}
            </div>

            {/* Common skills pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Suggested Specialties:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SKILLS.map((skill) => {
                  const isChecked = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {isChecked ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom skill input */}
            <div className="flex items-center gap-2 max-w-sm pt-1">
              <Input
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={addCustomSkill}
                placeholder="Add custom skill and press Enter"
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomSkill}
                className="text-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-3 pt-3 border-t border-border/70">
            <div>
              <Label className="text-xs font-semibold">
                Working Languages
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Evaluation tasks often require native-level fluency in multiple languages.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 min-h-8">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 text-[#78350F] border border-accent/40 text-xs font-semibold"
                >
                  <span>{lang}</span>
                  <button
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className="hover:text-destructive cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_LANGUAGES.map((lang) => {
                const isChecked = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isChecked
                        ? "bg-accent/30 text-[#78350F] border-accent/60 font-semibold"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-accent hover:text-foreground"
                    }`}
                  >
                    {isChecked ? `✓ ${lang}` : `+ ${lang}`}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 max-w-sm pt-1">
              <Input
                value={newLanguageInput}
                onChange={(e) => setNewLanguageInput(e.target.value)}
                onKeyDown={addCustomLanguage}
                placeholder="Add custom language"
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomLanguage}
                className="text-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Background */}
      {activeTab === "background" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Professional Background & Credentials
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Highlight your clinical, legal, or technical milestones to boost review priority.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold">
              Professional Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Dr. Hayes has over 12 years of experience in clinical oncology, translational genetics, and algorithmic drug response modeling..."
              className="text-xs leading-relaxed"
              maxLength={1500}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Detailed overview of your academic or industry accomplishments.</span>
              <span>{bio.length}/1500</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedin_url" className="text-xs font-semibold">
              LinkedIn Profile URL
            </Label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="linkedin_url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Structured Education */}
          <div className="space-y-3 pt-3 border-t border-border/70">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Education & Academic Degrees
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Degrees, institutions, and graduation years.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddEdu(true)}
                className="text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Degree</span>
              </Button>
            </div>

            {/* List */}
            {education.length > 0 ? (
              <div className="space-y-2">
                {education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border/70 bg-muted/20 flex items-start justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {edu.degree} {edu.field && `in ${edu.field}`}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {edu.school} {edu.year && `• Class of ${edu.year}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEducation(idx)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                No education history added yet.
              </div>
            )}

            {/* Add Education Modal/Box */}
            {showAddEdu && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 mt-2">
                <h4 className="text-xs font-bold text-foreground">Add New Degree</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Institution (e.g. Stanford University)"
                    value={newEdu.school}
                    onChange={(e) => setNewEdu({ ...newEdu, school: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <Input
                    placeholder="Degree (e.g. M.D., Ph.D., B.S.)"
                    value={newEdu.degree}
                    onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <Input
                    placeholder="Field of Study (e.g. Oncology & Bioengineering)"
                    value={newEdu.field || ""}
                    onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <Input
                    placeholder="Graduation Year (e.g. 2018)"
                    value={newEdu.year || ""}
                    onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddEdu(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddEducation}
                    className="text-xs"
                  >
                    Add Degree
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Structured Experience */}
          <div className="space-y-3 pt-3 border-t border-border/70">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Professional Experience
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Relevant past roles, research appointments, or advisory positions.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddExp(true)}
                className="text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Role</span>
              </Button>
            </div>

            {/* List */}
            {experience.length > 0 ? (
              <div className="space-y-2">
                {experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border/70 bg-muted/20 flex items-start justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {exp.title}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">
                        {exp.company}{" "}
                        {(exp.from || exp.to) &&
                          `• ${exp.from || ""} - ${exp.to || "Present"}`}
                      </p>
                      {exp.summary && (
                        <p className="text-xs text-muted-foreground/90 mt-1 leading-relaxed">
                          {exp.summary}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExperience(idx)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                No past roles added yet.
              </div>
            )}

            {/* Add Experience Modal/Box */}
            {showAddExp && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 mt-2">
                <h4 className="text-xs font-bold text-foreground">Add Experience Role</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Organization / Company"
                    value={newExp.company}
                    onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <Input
                    placeholder="Role / Title (e.g. Lead Research Scientist)"
                    value={newExp.title}
                    onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <Input
                    placeholder="From Year (e.g. 2020)"
                    value={newExp.from || ""}
                    onChange={(e) => setNewExp({ ...newExp, from: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <Input
                    placeholder="To Year (or 'Present')"
                    value={newExp.to || ""}
                    onChange={(e) => setNewExp({ ...newExp, to: e.target.value })}
                    className="text-xs bg-background"
                  />
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Brief role summary (optional)"
                      value={newExp.summary || ""}
                      onChange={(e) => setNewExp({ ...newExp, summary: e.target.value })}
                      className="text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddExp(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddExperience}
                    className="text-xs"
                  >
                    Add Role
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Availability */}
      {activeTab === "availability" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Availability & Geographic Presence
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify your schedule and location to match synchronised review batches.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-xs font-semibold">
                Country of Residence <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone" className="text-xs font-semibold">
                Primary Timezone
              </Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-2 pt-2">
              <Label className="text-xs font-semibold">
                Weekly Time Commitment
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {WEEKLY_HOURS_OPTIONS.map((opt) => {
                  const isSelected = weeklyHours === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWeeklyHours(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-2xs"
                          : "bg-muted/20 border-border hover:border-primary/40 text-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        ~{opt.value} hrs / week
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Account */}
      {activeTab === "account" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Account Security & Access
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your credentials, platform role, and authentication settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="account_email" className="text-xs font-semibold">
                Associated Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="account_email"
                  value={profile.email}
                  disabled
                  className="pl-9 text-xs bg-muted/50 cursor-not-allowed opacity-80"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Managed via Supabase Auth identity provider.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Role</Label>
              <div className="h-9 px-3 rounded-md border border-border bg-muted/40 flex items-center justify-between text-xs">
                <span className="font-semibold capitalize text-foreground">
                  {profile.role}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Verified
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Domain expert access permissions.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border/70 space-y-4">
            <h4 className="text-xs font-bold text-foreground">Password & Recovery</h4>
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Update your security password
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Receive a magic password reset link sent to your registered email.
                </p>
              </div>
              <Link href="/forgot-password">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold shrink-0"
                >
                  Send Reset Link
                </Button>
              </Link>
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-destructive/20 space-y-3">
            <h4 className="text-xs font-bold text-destructive">Danger Zone</h4>
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Account Deletion Request
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Contact platform compliance administrators to purge your credentials and submitted data.
                </p>
              </div>
              <a
                href="mailto:support@revive.ai?subject=Account%20Deletion%20Request"
                className="inline-flex items-center text-xs font-semibold text-destructive hover:underline shrink-0"
              >
                Request Deletion
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Actions Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-lg">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="hidden sm:inline">
            All updates are securely recorded and synchronized to active task evaluations.
          </span>
          <span className="sm:hidden">
            Changes save to all active tabs.
          </span>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="rounded-full px-6 text-xs font-bold shadow-2xs gap-2 shrink-0"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>Save Changes</span>
        </Button>
      </div>
    </form>
  );
}
