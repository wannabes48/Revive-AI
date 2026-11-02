"use client";

import * as React from "react";
import Link from "next/link";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Sparkles,
  Briefcase,
  DollarSign,
  Users,
  HelpCircle,
  Bell,
  Send,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

export type DashboardTab = "ai-work" | "projects" | "payments" | "referrals";

interface DashboardSubnavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  userEmail?: string;
  userAvatarUrl?: string | null;
  userFullName?: string | null;
  unreadCount?: number;
}

export function DashboardSubnav({
  activeTab,
  onTabChange,
  userEmail,
  userAvatarUrl,
  userFullName,
  unreadCount = 0,
}: DashboardSubnavProps) {
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [supportSubject, setSupportSubject] = React.useState("");
  const [supportMessage, setSupportMessage] = React.useState("");
  const [sendingSupport, setSendingSupport] = React.useState(false);

  const displayName = userFullName || userEmail?.split("@")[0] || "Contributor";

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    setSendingSupport(true);
    setTimeout(() => {
      setSendingSupport(false);
      setSupportOpen(false);
      setSupportSubject("");
      setSupportMessage("");
      toast.success("Support ticket opened. Our operations team responds within 2 hours.");
    }, 600);
  };

  const navItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: "ai-work", label: "AI Work", icon: Sparkles },
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "referrals", label: "Referrals", icon: Users },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 min-w-0" aria-label="Dashboard views">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer touch-target ${
                  isActive
                    ? "bg-[#0F766E] text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right utility items: Support trigger, notifications bell, user avatar */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {/* Support Modal Trigger */}
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors cursor-pointer touch-target"
            title="Open contributor support"
          >
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Need help?</span>
          </button>

          {/* Notifications bell */}
          <Link
            href="/notifications"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors touch-target"
            title="View alerts and notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Link>

          {/* User Avatar */}
          <Link
            href="/profile"
            className="flex items-center gap-2 pl-1 group"
            title="View contributor profile"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Support Dialog */}
      <ResponsiveDialog
        open={supportOpen}
        onOpenChange={setSupportOpen}
        title="Contributor Priority Support"
        description="Have a question about task guidelines, evaluation rubrics, or payout timelines? Our specialist team is here to assist."
      >
        <form onSubmit={handleSendSupport} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="supportSubject" className="text-xs font-semibold">
              Issue Category
            </Label>
            <select
              id="supportSubject"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              required
              className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground"
            >
              <option value="">Select issue category...</option>
              <option value="rubric_clarification">Task Rubric or Guideline Clarification</option>
              <option value="technical_bug">Technical Bug or Evaluation UI Issue</option>
              <option value="payment_inquiry">Earnings Ledger or Payout Routing</option>
              <option value="onboarding_assistance">Onboarding Assessment Inquiry</option>
              <option value="other">General Contributor Inquiry</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supportMessage" className="text-xs font-semibold">
              Describe your question or issue
            </Label>
            <textarea
              id="supportMessage"
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Provide relevant details such as task slug, project name, or error details..."
              required
              rows={4}
              className="w-full p-3 text-xs rounded-xl border border-border bg-background placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSupportOpen(false)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendingSupport || !supportSubject || !supportMessage.trim()}
              className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sendingSupport ? "Submitting..." : "Send Ticket"}</span>
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </>
  );
}
