"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LedgerEntry, Task, Profile, LedgerKind } from "@/lib/supabase/types";
import { adminAdjustLedger } from "@/actions/admin-work";
import { formatDate, formatDateTime, formatCents } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  TrendingUp,
  Wallet,
  DollarSign,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

export interface TaskSpendMetric {
  id: string;
  title: string;
  slug: string;
  budget_cents: number | null;
  totalSpentCents: number;
  approvedCount: number;
  costPerApprovedItemCents: number | null;
}

export interface FinanceOverviewProps {
  metrics: {
    earnedThisMonthCents: number;
    paidOutThisMonthCents: number;
    pendingHoldCents: number;
    owedAvailableCents: number;
    totalOwedLiabilityCents: number;
    openPayoutRequestsCount: number;
    openPayoutRequestsCents: number;
  };
  taskSpends: TaskSpendMetric[];
  ledger: (LedgerEntry & { profile?: { full_name: string | null; email: string } })[];
  contributors: { id: string; full_name: string | null; email: string }[];
}

export function FinanceOverview({
  metrics,
  taskSpends,
  ledger,
  contributors,
}: FinanceOverviewProps) {
  const router = useRouter();

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<string>("all");

  // Adjustment Modal
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string>(contributors[0]?.id || "");
  const [adjustKind, setAdjustKind] = React.useState<"bonus" | "adjustment">("bonus");
  const [adjustDollars, setAdjustDollars] = React.useState<string>("");
  const [adjustNote, setAdjustNote] = React.useState<string>("");
  const [isAdjusting, setIsAdjusting] = React.useState(false);

  // Filtered ledger entries
  const filteredLedger = React.useMemo(() => {
    return ledger.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchNote = e.note?.toLowerCase().includes(q);
      const matchName = e.profile?.full_name?.toLowerCase().includes(q);
      const matchEmail = e.profile?.email.toLowerCase().includes(q);
      return matchNote || matchName || matchEmail;
    });
  }, [ledger, kindFilter, searchQuery]);

  // Handle Export CSV
  function handleExportCSV() {
    const headers = ["ID", "Contributor", "Email", "Kind", "Amount USD", "Available At", "Created At", "Note"];
    const rows = filteredLedger.map((e) => [
      e.id,
      `"${(e.profile?.full_name || "").replace(/"/g, '""')}"`,
      e.profile?.email || "",
      e.kind,
      (e.amount_cents / 100).toFixed(2),
      new Date(e.available_at).toISOString().split("T")[0],
      new Date(e.created_at).toISOString().split("T")[0],
      `"${(e.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ReviveAI_Finance_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle Create Adjustment / Bonus
  async function handleCreateAdjustment(e: React.FormEvent) {
    e.preventDefault();

    const amt = parseFloat(adjustDollars || "0");
    if (isNaN(amt) || amt === 0) {
      toast.error("Please enter a non-zero dollar amount.");
      return;
    }

    if (!adjustNote.trim()) {
      toast.error("A written note explaining this adjustment is required.");
      return;
    }

    const cents = Math.round(amt * 100);
    setIsAdjusting(true);
    const res = await adminAdjustLedger(selectedUserId, adjustKind, cents, adjustNote.trim());
    setIsAdjusting(false);

    if (res.error) {
      toast.error("Adjustment failed", { description: res.error });
    } else {
      toast.success(
        cents > 0
          ? `${adjustKind === "bonus" ? "Bonus" : "Credit"} credited to contributor.`
          : "Clawback debited from contributor."
      );
      setAdjustOpen(false);
      setAdjustDollars("");
      setAdjustNote("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Financial Ledger & Liability Oversight
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit system solvency, monitor per-task spend caps, and review immutable accounting entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAdjustOpen(true)}
            className="rounded-full text-xs font-bold gap-1.5 h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Bonus / Adjustment</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-full text-xs font-semibold gap-1.5 h-8"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Ledger CSV</span>
          </Button>
        </div>
      </div>

      {/* 5 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Liability Check */}
        <div className="bg-card rounded-[14px] border-2 border-primary/30 p-4 shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold text-primary">Total Owed (Solvency)</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-heading font-extrabold text-2xl text-foreground">
              {formatCents(metrics.totalOwedLiabilityCents)}
            </p>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Available ({formatCents(metrics.owedAvailableCents)}) + Pending ({formatCents(metrics.pendingHoldCents)})
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            Liability if all users withdraw today.
          </span>
        </div>

        {/* Card 2: Earned this Month */}
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs flex flex-col justify-between gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Earned This Month</span>
          <div>
            <p className="font-heading font-extrabold text-2xl text-[#0F766E]">
              {formatCents(metrics.earnedThisMonthCents)}
            </p>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              All approved items & bonuses
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            Current calendar month gross.
          </span>
        </div>

        {/* Card 3: Paid Out this Month */}
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs flex flex-col justify-between gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Paid Out This Month</span>
          <div>
            <p className="font-heading font-extrabold text-2xl text-foreground">
              {formatCents(metrics.paidOutThisMonthCents)}
            </p>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Settled to Wise & Payoneer accounts
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            Disbursed in current month.
          </span>
        </div>

        {/* Card 4: In 7-Day Hold */}
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs flex flex-col justify-between gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">In Review Hold</span>
          <div>
            <p className="font-heading font-extrabold text-2xl text-[#B45309]">
              {formatCents(metrics.pendingHoldCents)}
            </p>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Within 7-day quality hold
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            Auto-clears to available daily.
          </span>
        </div>

        {/* Card 5: Open Payouts */}
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Open Withdrawals</span>
            <Link href="/admin/payouts" className="text-[10px] font-bold text-primary hover:underline">
              Queue →
            </Link>
          </div>
          <div>
            <p className="font-heading font-extrabold text-2xl text-foreground">
              {formatCents(metrics.openPayoutRequestsCents)}
            </p>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {metrics.openPayoutRequestsCount} pending disbursement
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            Awaiting administrator processing.
          </span>
        </div>
      </div>

      {/* Task Spend Against Budgets */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="font-heading font-bold text-base text-foreground">
            Per-Task Spend vs. Budget Caps
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realized expenditure on completed evaluations compared against task budget ceilings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {taskSpends.map((ts) => {
            const hasBudget = ts.budget_cents != null && ts.budget_cents > 0;
            const pct = hasBudget ? Math.min(100, Math.round((ts.totalSpentCents / ts.budget_cents!) * 100)) : 0;

            return (
              <div
                key={ts.id}
                className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-heading font-bold text-sm text-foreground truncate">
                    {ts.title}
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-card border border-border shrink-0">
                    {ts.approvedCount} items
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-bold text-[#0F766E]">
                      {formatCents(ts.totalSpentCents)}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {hasBudget ? `/ ${formatCents(ts.budget_cents!)} budget` : "No budget cap"}
                    </span>
                  </div>

                  {hasBudget && (
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-[#B45309]" : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground flex justify-between pt-1 border-t border-border/50">
                  <span>Unit Cost:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {ts.costPerApprovedItemCents != null
                      ? `${formatCents(ts.costPerApprovedItemCents)} / item`
                      : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Searchable Ledger Table */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden space-y-4">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-sm text-foreground">
              Immutable Accounting Ledger ({filteredLedger.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Kind Filter */}
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-8 px-2.5 rounded-full border border-border bg-background text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="all">All Kinds</option>
              <option value="earning">Earnings</option>
              <option value="bonus">Bonuses</option>
              <option value="adjustment">Adjustments</option>
              <option value="payout">Payouts</option>
              <option value="payout_reversal">Reversals</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search contributor or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 bg-background rounded-full w-52"
              />
            </div>
          </div>
        </div>

        <ResponsiveTable
          data={filteredLedger}
          keyExtractor={(entry) => entry.id}
          emptyMessage="No accounting entries matching search filters."
          columns={[
            {
              header: "Date",
              priority: "secondary",
              cell: (entry) => (
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatDate(entry.created_at)}
                </span>
              ),
            },
            {
              header: "Contributor",
              priority: "primary",
              cell: (entry) => (
                <div>
                  <span className="font-semibold text-foreground block">
                    {entry.profile?.full_name || entry.profile?.email || entry.user_id.slice(0, 8)}
                  </span>
                  {entry.profile?.email && (
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {entry.profile.email}
                    </span>
                  )}
                </div>
              ),
            },
            {
              header: "Category",
              priority: "secondary",
              cell: (entry) => (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                  {entry.kind}
                </span>
              ),
            },
            {
              header: "Note / Task Title",
              priority: "primary",
              cell: (entry) => (
                <span className="text-foreground/90 font-medium break-words">
                  {entry.note || "—"}
                </span>
              ),
            },
            {
              header: "Amount USD",
              priority: "primary",
              cell: (entry) => {
                const isCredit = entry.amount_cents > 0;
                return (
                  <span
                    className={`font-mono font-bold text-sm whitespace-nowrap ${
                      isCredit ? "text-[#0F766E]" : "text-destructive"
                    }`}
                  >
                    {isCredit ? "+" : ""}
                    {formatCents(entry.amount_cents)}
                  </span>
                );
              },
            },
            {
              header: "Available At",
              priority: "secondary",
              cell: (entry) => (
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatDate(entry.available_at)}
                </span>
              ),
            },
            {
              header: "Status",
              priority: "primary",
              align: "right",
              cell: (entry) => {
                const isAvailable = new Date(entry.available_at).getTime() <= Date.now();
                return isAvailable ? (
                  <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E]">
                    Available
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                    Pending Hold
                  </span>
                );
              },
            },
          ]}
        />
      </div>

      {/* ADD BONUS / ADJUSTMENT DIALOG */}
      <ResponsiveDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title="Add Ledger Entry"
        description="Credit a performance bonus or make an administrative adjustment (use negative for clawback)."
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustOpen(false)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="adjustment-form"
              disabled={isAdjusting || !adjustDollars.trim() || !adjustNote.trim()}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-10 touch-target"
            >
              {isAdjusting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>Record Entry</span>
            </Button>
          </div>
        }
      >
        <form id="adjustment-form" onSubmit={handleCreateAdjustment} className="space-y-4 py-2">
          {/* Contributor Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Contributor *</Label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full h-10 min-h-[44px] rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {contributors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                </option>
              ))}
            </select>
          </div>

          {/* Entry Kind */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Entry Kind *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustKind("bonus")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer touch-target ${
                  adjustKind === "bonus"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border"
                }`}
              >
                Bonus (Credit)
              </button>
              <button
                type="button"
                onClick={() => setAdjustKind("adjustment")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer touch-target ${
                  adjustKind === "adjustment"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border"
                }`}
              >
                Adjustment (Credit/Clawback)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="adj_amount" className="text-xs font-semibold">
              Amount (USD) *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                $
              </span>
              <Input
                id="adj_amount"
                type="number"
                step="0.01"
                placeholder="50.00 (or -25.00 for clawback)"
                value={adjustDollars}
                onChange={(e) => setAdjustDollars(e.target.value)}
                required
                className="pl-7 text-base sm:text-xs h-10 min-h-[44px] bg-background font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Use a negative number (e.g. -15.00) to execute a clawback adjustment.
            </span>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="adj_note" className="text-xs font-semibold">
              Audit Explanation / Note *
            </Label>
            <Textarea
              id="adj_note"
              placeholder="e.g. Q2 Frontier Oncology benchmark velocity bonus for outstanding quality."
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              required
              rows={3}
              className="text-base sm:text-xs bg-background"
            />
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
