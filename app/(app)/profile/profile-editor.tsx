"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Profile } from "@/types";
import { profileCompleteness } from "@/lib/profile";
import { BasicsTab } from "./tabs/basics";
import { ExpertiseTab } from "./tabs/expertise";
import { BackgroundTab } from "./tabs/background";
import { AvailabilityTab } from "./tabs/availability";
import { AccountTab } from "./tabs/account";
import {
  User,
  Sparkles,
  GraduationCap,
  Clock,
  Shield,
  Zap,
} from "lucide-react";

interface ProfileEditorProps {
  profile: Profile;
  initialTab?: string;
}

type TabKey = "basics" | "expertise" | "background" | "availability" | "account";

export function ProfileEditor({ profile, initialTab }: ProfileEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const completeness = profileCompleteness(profile);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "basics", label: "Basics", icon: User },
    { key: "expertise", label: "Expertise", icon: Sparkles },
    { key: "background", label: "Background", icon: GraduationCap },
    { key: "availability", label: "Availability", icon: Clock },
    { key: "account", label: "Account", icon: Shield },
  ];

  const displayName = profile.full_name || profile.email.split("@")[0] || "Contributor";

  return (
    <div className="space-y-6">
      {/* Header Strip */}
      <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-heading font-black text-xl shadow-2xs shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-bold text-foreground truncate">
                  {displayName}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  {profile.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {profile.headline || profile.expertise || "Domain Contributor"}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-2">
                <span>{profile.email}</span>
                {profile.country && <span>• {profile.country}</span>}
              </p>
            </div>
          </div>

          {/* Completeness Bar */}
          <div className="sm:text-right shrink-0 bg-muted/40 p-3 rounded-xl border border-border/60">
            <div className="flex items-center sm:justify-end gap-2 mb-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Profile Completeness
              </span>
              <span className="font-mono text-xs font-bold text-primary">
                {completeness.score}%
              </span>
            </div>
            <div className="w-full sm:w-44 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${completeness.score}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {completeness.score >= 50
                ? "✓ Meets application threshold (50%+)"
                : `${50 - completeness.score}% more needed to apply`}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
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

      {/* Active Tab Panel */}
      {activeTab === "basics" && <BasicsTab profile={profile} />}
      {activeTab === "expertise" && <ExpertiseTab profile={profile} />}
      {activeTab === "background" && <BackgroundTab profile={profile} />}
      {activeTab === "availability" && <AvailabilityTab profile={profile} />}
      {activeTab === "account" && <AccountTab profile={profile} />}
    </div>
  );
}
