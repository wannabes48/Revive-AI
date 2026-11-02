"use client";

import * as React from "react";
import Link from "next/link";
import { WeeklyEarningsPoint, PaymentCycleItem } from "@/lib/projects-data";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Download,
  Info,
} from "lucide-react";

interface PaymentsAnalyticsViewProps {
  analytics: {
    awaitingPayoutDollars: number;
    totalPaidDollars: number;
    tasksThisWeek: number;
    hoursThisWeek: number;
    grandTotalEarningsDollars: number;
    weeklyChart: WeeklyEarningsPoint[];
    paymentCycles: PaymentCycleItem[];
  };
}

export function PaymentsAnalyticsView({ analytics }: PaymentsAnalyticsViewProps) {
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<string>("all_time");
  const [expandedCycles, setExpandedCycles] = React.useState<Set<string>>(
    new Set([analytics.paymentCycles[0]?.id || "cycle_feb_16_22"])
  );
  const [hoveredPoint, setHoveredPoint] = React.useState<WeeklyEarningsPoint | null>(null);

  const toggleCycle = (cycleId: string) => {
    setExpandedCycles((prev) => {
      const next = new Set(prev);
      if (next.has(cycleId)) {
        next.delete(cycleId);
      } else {
        next.add(cycleId);
      }
      return next;
    });
  };

  // Filter cycles based on selectedProject if needed
  const filteredCycles = React.useMemo(() => {
    if (selectedProject === "all") return analytics.paymentCycles;
    return analytics.paymentCycles.filter((cycle) =>
      cycle.projectLogs.some((p) => p.projectName.toLowerCase().includes(selectedProject.toLowerCase()))
    );
  }, [analytics.paymentCycles, selectedProject]);

  // Compute highest earning week for scaling bar chart
  const maxWeeklyAmount = React.useMemo(() => {
    const max = Math.max(...analytics.weeklyChart.map((p) => p.amountDollars), 1000);
    return max * 1.15; // 15% ceiling headroom
  }, [analytics.weeklyChart]);

  return (
    <div className="space-y-8">
      {/* 1. Summary Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Payments & Earnings Analytics
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Transparent breakdown of verified evaluation hours, weekly cycles, and direct disbursement history.
          </p>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs font-semibold rounded-full border border-border bg-card text-foreground cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="all">All Projects</option>
              <option value="math">Project Euler: Frontier Math</option>
              <option value="vision">Vision-Language Grounding</option>
              <option value="legal">Statutory Law & Regulatory</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Timeframe Filter */}
          <div className="relative">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs font-semibold rounded-full border border-border bg-card text-foreground cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="all_time">All Time</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="year_2026">2026 Full Year</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <Link href="/earnings">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold h-9 px-3.5 gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Full Ledger</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Grand Total Banner & Totals Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Grand Total Banner */}
        <div className="sm:col-span-1 bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
              Cumulative Gross Earnings
            </span>
            <div className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-white">
              ${analytics.grandTotalEarningsDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
            <TrendingUp className="h-4 w-4" />
            <span>USD Ledger • 100% On-Time Payouts</span>
          </div>
        </div>

        {/* Awaiting Payout */}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Awaiting Payout
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F766E]">
            ${analytics.awaitingPayoutDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Accrued in current open weekly cycle • Scheduled next payout run.
          </p>
        </div>

        {/* Total Paid Out */}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Disbursed
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#0F766E]" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
            ${analytics.totalPaidDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Successfully deposited to verified contractor accounts.
          </p>
        </div>
      </div>

      {/* 3. Weekly Earnings Responsive Bar Chart */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Weekly Earnings Trajectory
            </h3>
            <p className="text-xs text-muted-foreground">
              Chronological performance across consecutive verification cycles.
            </p>
          </div>

          {/* Interactive Tooltip Display Badge */}
          {hoveredPoint ? (
            <div className="inline-flex items-center gap-2 bg-[#CCFBF1] text-[#0F766E] border border-[#0F766E]/30 px-3 py-1 rounded-full text-xs font-bold animate-fadeIn">
              <span>{hoveredPoint.weekLabel}:</span>
              <span>${hoveredPoint.amountDollars.toFixed(2)}</span>
              <span className="font-normal text-xs text-[#0F766E]/80">• {hoveredPoint.hoursWorked}h logged</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic hidden sm:inline">
              Hover over bars to inspect itemized hours & tasks
            </span>
          )}
        </div>

        {/* Pure CSS / SVG Responsive Bar Visualizer */}
        <div className="pt-6 pb-2">
          <div className="h-48 sm:h-56 flex items-end justify-between gap-2 sm:gap-6 border-b border-border/80 px-2 sm:px-6">
            {analytics.weeklyChart.map((point, index) => {
              const heightPercent = Math.max(12, Math.round((point.amountDollars / maxWeeklyAmount) * 100));
              const isHovered = hoveredPoint?.weekLabel === point.weekLabel;

              return (
                <div
                  key={point.weekLabel}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Amount label above bar */}
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-bold mb-2 transition-all ${
                      isHovered ? "text-[#0F766E] scale-110" : "text-muted-foreground"
                    }`}
                  >
                    ${Math.round(point.amountDollars)}
                  </span>

                  {/* Soft emerald green bar */}
                  <div className="w-full max-w-[48px] bg-muted/40 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        index === analytics.weeklyChart.length - 1
                          ? "bg-[#0F766E]/75 hover:bg-[#0F766E]" // current unfinalized week
                          : isHovered
                          ? "bg-[#0F766E]"
                          : "bg-[#10B981] hover:bg-[#059669]"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Week label below baseline */}
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-2 whitespace-nowrap text-center">
                    {point.weekLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Detailed Payment Breakdown & Accordion History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Itemized Payment Cycles
            </h3>
            <p className="text-xs text-muted-foreground">
              Collapsible cycle statements with gross earnings, hours, rates, and reference hashes.
            </p>
          </div>
        </div>

        {filteredCycles.length > 0 ? (
          <div className="space-y-3">
            {filteredCycles.map((cycle) => {
              const isExpanded = expandedCycles.has(cycle.id);
              const isPaid = cycle.status === "paid";

              return (
                <div
                  key={cycle.id}
                  className="bg-card rounded-2xl border border-border shadow-2xs overflow-hidden transition-all"
                >
                  {/* Accordion Row Header */}
                  <div
                    onClick={() => toggleCycle(cycle.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/20 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Expand payment cycle details"
                        className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground transition-transform shrink-0"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-90 text-foreground" : ""
                          }`}
                        />
                      </button>

                      <div>
                        <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                          Cycle: {cycle.cyclePeriod}
                        </h4>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Ref: {cycle.referenceHash}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pl-10 sm:pl-0">
                      {/* Status Pill */}
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] bg-[#E5EFEC] px-3 py-1 rounded-full border border-[#0F766E]/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Paid on {cycle.paidOn}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Scheduled Disbursement</span>
                        </span>
                      )}

                      {/* Net Payout Amount */}
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-heading font-extrabold text-foreground block">
                          ${cycle.netPayoutDollars.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase block">
                          Net Payout
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-border/60 bg-muted/10 space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Itemized Project Contributions
                      </h5>

                      <div className="divide-y divide-border/50 border border-border/60 rounded-xl bg-background overflow-hidden">
                        {cycle.projectLogs.map((log, i) => (
                          <div
                            key={i}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <span className="font-bold text-foreground block truncate">
                                {log.projectName}
                              </span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                Task: {log.taskTitle}
                              </span>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-mono shrink-0">
                              <span className="text-muted-foreground">
                                {log.hours} hrs @ {log.rateFormatted}
                              </span>
                              <span className="font-bold text-foreground">
                                ${log.totalAmountDollars.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Gross to Net Ledger Summary */}
                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>Gross: <strong>${cycle.grossAmountDollars.toFixed(2)}</strong></span>
                          <span>Platform Deductions: <strong>${cycle.deductionsDollars.toFixed(2)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Disbursed via Direct Transfer:</span>
                          <strong className="text-foreground font-mono font-bold">${cycle.netPayoutDollars.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="font-heading text-sm font-bold text-foreground">
              No payment cycles recorded yet
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your itemized task earnings and weekly disbursement cycles will populate here automatically as your evaluation submissions are reviewed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
