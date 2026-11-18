"use client";

import * as React from "react";
import Link from "next/link";
import {
  ReferralDashboardCard,
  type ReferralCardData,
} from "@/components/referrals/referral-dashboard-card";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Users,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
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
    referralCode?: string;
    referralEarningsDollars?: number;
  };
  referral?: ReferralCardData | null;
  onNavigateToPayments?: () => void;
}

export function DashboardSidebarWidgets({
  analytics,
  referral = null,
  onNavigateToPayments,
}: DashboardSidebarWidgetsProps) {
  return (
    <div className="space-y-6">
      {/* 1. Earnings Quick Glance Widget */}
      <div
        data-tour="earnings-sidebar"
        className="bg-card rounded-2xl border border-border p-5 shadow-2xs space-y-4"
      >
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

      {/* Quick Action Links */}
      <div
        data-tour="payout-setup"
        className="bg-card rounded-2xl border border-border p-4 shadow-2xs divide-y divide-border/60"
      >
        <Link
          href="/earnings?tab=methods"
          className="flex items-center justify-between py-2 text-xs font-semibold text-foreground hover:text-[#0F766E] transition-colors group"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#0F766E]" />
            <span>Setup payout method</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="/profile"
          className="flex items-center justify-between py-2 text-xs font-semibold text-foreground hover:text-[#0F766E] transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Update your profile</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
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

      {/* 3. Referral program (live settings) */}
      {referral && <ReferralDashboardCard data={referral} />}
    </div>
  );
}
