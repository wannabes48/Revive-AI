"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { saveBasics } from "@/actions/profile";
import { COUNTRIES, TIMEZONES } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUploader } from "@/components/app/avatar-uploader";
import {
  User,
  Globe,
  Clock,
  Phone,
  FileText,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BasicsTabProps {
  profile: Profile;
}

export function BasicsTab({ profile }: BasicsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  // Fields
  const [fullName, setFullName] = React.useState(profile.full_name || "");
  const [headline, setHeadline] = React.useState(profile.headline || "");
  const [bio, setBio] = React.useState(profile.bio || "");
  const [country, setCountry] = React.useState(profile.country || "");
  const [timezone, setTimezone] = React.useState(profile.timezone || "America/New_York (EST/EDT)");
  const [phone, setPhone] = React.useState(profile.phone || "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url || "");

  // Search filter for countries
  const [countrySearch, setCountrySearch] = React.useState("");

  const filteredCountries = React.useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [countrySearch]);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<any>>, val: any) => {
    setter(val);
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await saveBasics({
      full_name: fullName.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      country: country.trim(),
      timezone: timezone.trim() || undefined,
      phone: phone.trim() || undefined,
      avatar_url: avatarUrl.trim() || undefined,
    });

    setLoading(false);

    if (res.error) {
      if (typeof res.error === "object") {
        const firstErr = Object.values(res.error)[0]?.[0] || "Validation failed.";
        toast.error("Could not save basics", { description: firstErr });
      } else {
        toast.error("Could not save basics", { description: res.error });
      }
    } else {
      setIsDirty(false);
      toast.success("Basics saved", {
        description: "Your identification credentials have been updated.",
      });
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Basic Information
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your name, professional summary, and contact information.
          </p>
        </div>

        {/* Avatar Uploader */}
        <div className="pb-4 border-b border-border/60">
          <AvatarUploader
            value={avatarUrl}
            onChange={(url) => handleChange(setAvatarUrl, url)}
            name={fullName}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name (#full_name anchor) */}
          <div id="full_name" className="space-y-1.5 scroll-mt-24">
            <Label htmlFor="input_full_name" className="text-xs font-semibold">
              Full Legal Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="input_full_name"
                value={fullName}
                onChange={(e) => handleChange(setFullName, e.target.value)}
                placeholder="Dr. Jordan Hayes"
                className="pl-9 text-xs"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
          </div>

          {/* Phone Number (#phone anchor) */}
          <div id="phone" className="space-y-1.5 scroll-mt-24">
            <Label htmlFor="input_phone" className="text-xs font-semibold">
              Phone Number <span className="text-muted-foreground text-[10px]">(Optional)</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="input_phone"
                value={phone}
                onChange={(e) => handleChange(setPhone, e.target.value)}
                placeholder="+1 555 123 4567"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Professional Headline (#headline anchor) */}
          <div id="headline" className="sm:col-span-2 space-y-1.5 scroll-mt-24">
            <Label htmlFor="input_headline" className="text-xs font-semibold">
              Professional Headline
            </Label>
            <Input
              id="input_headline"
              value={headline}
              onChange={(e) => handleChange(setHeadline, e.target.value)}
              placeholder="Lead Clinical Oncologist & Biomedical Systems Evaluator"
              className="text-xs"
              maxLength={100}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Short one-liner displayed on candidate review cards.</span>
              <span>{headline.length}/100</span>
            </div>
          </div>

          {/* Professional Bio (#bio anchor) */}
          <div id="bio" className="sm:col-span-2 space-y-1.5 scroll-mt-24">
            <Label htmlFor="input_bio" className="text-xs font-semibold">
              Bio Summary <span className="text-muted-foreground text-[10px]">(50+ characters required for points)</span>
            </Label>
            <Textarea
              id="input_bio"
              value={bio}
              onChange={(e) => handleChange(setBio, e.target.value)}
              rows={4}
              placeholder="Describe your domain specialty, educational background, or evaluation methodology..."
              className="text-xs leading-relaxed"
              maxLength={800}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span className={bio.length < 50 ? "text-amber-600 font-medium" : "text-primary font-medium"}>
                {bio.length < 50 ? `${50 - bio.length} more characters needed for points` : "✓ Bio length satisfied (50+ chars)"}
              </span>
              <span>{bio.length}/800</span>
            </div>
          </div>

          {/* Country (#country anchor) */}
          <div id="country" className="space-y-1.5 scroll-mt-24">
            <Label htmlFor="select_country" className="text-xs font-semibold">
              Country of Residence <span className="text-destructive">*</span>
            </Label>
            <select
              id="select_country"
              value={country}
              onChange={(e) => handleChange(setCountry, e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone (#timezone anchor) */}
          <div id="timezone" className="space-y-1.5 scroll-mt-24">
            <Label htmlFor="select_timezone" className="text-xs font-semibold">
              Primary Timezone
            </Label>
            <select
              id="select_timezone"
              value={timezone}
              onChange={(e) => handleChange(setTimezone, e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
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
            <span>Save Basics</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
