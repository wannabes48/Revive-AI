"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Users,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface DashboardSidebarWidgetsProps {
  analytics: {
    awaitingPayoutDollars: number;
    availableDollars?: number;
    pendingDollars?: number;
    totalPaidDollars: number;
    tasksThisWeek: number;
    hoursThisWeek: number;
    allTimeTasks?: number;
    allTimeHours?: number;
    referralCode: string;
    referralEarningsDollars: number;
  };
  onNavigateToPayments?: () => void;
}

export function DashboardSidebarWidgets({
  analytics,
  onNavigateToPayments,
}: DashboardSidebarWidgetsProps) {
  const [copied, setCopied] = React.useState(false);
  const [referralUrl, setReferralUrl] = React.useState(
    `https://reviveai.com/signup?ref=${analytics.referralCode}`
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setReferralUrl(`${window.location.origin}/signup?ref=${analytics.referralCode}`);
    }
  }, [analytics.referralCode]);

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Referral invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link to clipboard.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Earnings Quick Glance Widget */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#0F766E]" />
            <h4 className="font-heading text-sm font-bold text-foreground">
              Earnings Quick Glance
            </h4>
          </div>
          <button
            type="button"
            onClick={onNavigateToPayments}
            className="text-[11px] font-bold text-[#0F766E] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Full ledger</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Awaiting Payout
            </span>
            <span className="text-lg font-heading font-extrabold text-[#0F766E] block mt-0.5">
              ${analytics.awaitingPayoutDollars.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
              {analytics.pendingDollars && analytics.pendingDollars > 0
                ? `$${analytics.pendingDollars.toFixed(2)} in 7-day review hold`
                : analytics.availableDollars && analytics.availableDollars > 0
                ? `$${analytics.availableDollars.toFixed(2)} available now`
                : "No pending balance"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
              Total Paid Out
            </span>
            <span className="text-lg font-heading font-extrabold text-foreground block mt-0.5">
              ${analytics.totalPaidDollars.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
              All-time disbursed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/10 border border-border/40">
            <span>Tasks this week:</span>
            <span className="font-bold text-foreground">{analytics.tasksThisWeek}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/10 border border-border/40">
            <span>Hours logged:</span>
            <span className="font-bold text-foreground">{analytics.hoursThisWeek}h</span>
          </div>
        </div>
      </div>

      {/* 2. Fraud & Compliance Security Notice */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2 text-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <h4 className="font-heading text-xs font-bold uppercase tracking-wider">
            Integrity & Security Notice
          </h4>
        </div>
        <p className="text-xs text-amber-900/90 leading-relaxed">
          Spot suspicious activity? ReviveAI enforces cryptographic prompt provenance and human-in-the-loop audit logs. Never share API keys, credentials, or client task prompts.
        </p>
        <Link
          href="/support"
          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline inline-flex items-center gap-1"
        >
          <span>Report security concern</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 3. Referral Widget */}
      <div className="bg-gradient-to-br from-card via-[#F8FAF3] to-[#CCFBF1]/20 rounded-2xl border border-[#0F766E]/30 p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 text-[#0F766E]">
          <Users className="h-4 w-4 shrink-0" />
          <h4 className="font-heading text-sm font-bold text-foreground">
            Refer & Earn up to $700
          </h4>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Invite accredited disciplinary specialists. Earn up to $700 per verified colleague once they complete their onboarding evaluations.
        </p>

        {/* Copy Referral Link Pill */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 p-1.5 bg-background rounded-xl border border-border">
            <span
              suppressHydrationWarning
              className="text-xs font-mono text-muted-foreground px-2 truncate flex-1 select-all"
            >
              {referralUrl}
            </span>
            <Button
              size="sm"
              onClick={handleCopyReferral}
              className="rounded-lg text-xs font-bold h-8 px-3 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white shrink-0 gap-1 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>Code: <strong className="text-foreground">{analytics.referralCode}</strong></span>
            <span>Earned: <strong className="text-[#0F766E]">${analytics.referralEarningsDollars.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
