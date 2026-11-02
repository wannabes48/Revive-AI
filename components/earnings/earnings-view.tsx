"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WalletBalance,
  LedgerEntry,
  PayoutRequest,
  PayoutMethod,
  Profile,
  TimeEntry,
} from "@/lib/supabase/types";
import {
  savePayoutMethod,
  deletePayoutMethod,
  setDefaultPayoutMethod,
  requestPayout,
  cancelMyPayout,
} from "@/actions/payouts";
import {
  formatCents,
  formatDate,
  formatDateTime,
  maskDetails,
} from "@/lib/utils";
import { MIN_PAYOUT_CENTS, HOLD_DAYS } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import { TimesheetView } from "@/components/work/timesheet-view";
import {
  Wallet,
  Clock,
  ArrowDownToLine,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Calendar,
  Loader2,
  X,
  Mail,
  ShieldAlert,
  Check,
  Globe,
} from "lucide-react";

export interface HourlyTaskInfo {
  appId: string;
  taskId: string;
  slug: string;
  title: string;
  rateCents: number;
}

interface EarningsViewProps {
  wallet: WalletBalance;
  ledger: LedgerEntry[];
  payouts: PayoutRequest[];
  methods: PayoutMethod[];
  profile: Profile;
  hourlyTasks?: HourlyTaskInfo[];
  timeEntries?: TimeEntry[];
}

type TabType = "activity" | "payouts" | "methods" | "timesheet";

export function EarningsView({
  wallet,
  ledger,
  payouts,
  methods,
  profile,
  hourlyTasks = [],
  timeEntries = [],
}: EarningsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state (support query param ?tab=)
  const initialTab = searchParams.get("tab") as TabType;
  const [activeTab, setActiveTab] = React.useState<TabType>(
    initialTab && ["activity", "payouts", "methods", "timesheet"].includes(initialTab)
      ? initialTab
      : "activity"
  );

  // Selected hourly task for Timesheet tab
  const [selectedHourlyTaskId, setSelectedHourlyTaskId] = React.useState<string>(
    hourlyTasks[0]?.taskId || ""
  );

  // Filter state for activity tab
  const [kindFilter, setKindFilter] = React.useState<string>("all");
  const [monthFilter, setMonthFilter] = React.useState<string>("all");

  // Withdraw Modal State
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [selectedMethodId, setSelectedMethodId] = React.useState<string>(() => {
    const defaultM = methods.find((m) => m.is_default);
    return defaultM ? defaultM.id : methods[0]?.id || "";
  });
  const [withdrawDollars, setWithdrawDollars] = React.useState<string>(
    wallet.available_cents > 0 ? (wallet.available_cents / 100).toFixed(2) : "0.00"
  );
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);

  // Add Method Modal State (Wise & Payoneer)
  const [addMethodOpen, setAddMethodOpen] = React.useState(false);
  const [methodType, setMethodType] = React.useState<"wise" | "payoneer">("wise");
  const [accountEmail, setAccountEmail] = React.useState("");
  const [methodLabel, setMethodLabel] = React.useState("");
  const [isSavingMethod, setIsSavingMethod] = React.useState(false);

  // Action loaders
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = React.useState<string | null>(null);

  // Find next pending clearing date
  const nextClearingDate = React.useMemo(() => {
    const futureEntries = ledger.filter(
      (e) => new Date(e.available_at).getTime() > Date.now() && e.amount_cents > 0
    );
    if (futureEntries.length === 0) return null;
    futureEntries.sort(
      (a, b) => new Date(a.available_at).getTime() - new Date(b.available_at).getTime()
    );
    return futureEntries[0].available_at;
  }, [ledger]);

  // Distinct months in ledger
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    for (const entry of ledger) {
      const d = new Date(entry.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.add(key);
    }
    return Array.from(months).sort().reverse();
  }, [ledger]);

  // Filtered ledger entries
  const filteredLedger = React.useMemo(() => {
    return ledger.filter((entry) => {
      if (kindFilter !== "all" && entry.kind !== kindFilter) return false;
      if (monthFilter !== "all") {
        const d = new Date(entry.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key !== monthFilter) return false;
      }
      return true;
    });
  }, [ledger, kindFilter, monthFilter]);

  // Withdraw calculations
  const parsedWithdrawCents = Math.round(parseFloat(withdrawDollars || "0") * 100);
  const canWithdraw =
    wallet.available_cents >= MIN_PAYOUT_CENTS &&
    !profile.payouts_blocked &&
    methods.length > 0;

  // CSV Export for filtered ledger
  function exportLedgerCSV() {
    if (filteredLedger.length === 0) {
      toast.info("No ledger entries to export for this filter.");
      return;
    }
    const headers = ["Date", "Description", "Kind", "Amount (USD)", "Available Date", "Status"];
    const rows = filteredLedger.map((e) => [
      new Date(e.created_at).toISOString().split("T")[0],
      `"${(e.note || "Earning").replace(/"/g, '""')}"`,
      e.kind,
      (e.amount_cents / 100).toFixed(2),
      new Date(e.available_at).toISOString().split("T")[0],
      new Date(e.available_at).getTime() <= Date.now() ? "Available" : "Pending",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ReviveAI_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle Request Payout
  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();

    if (parsedWithdrawCents < MIN_PAYOUT_CENTS) {
      toast.error("Amount below minimum", {
        description: `Minimum withdrawal is ${formatCents(MIN_PAYOUT_CENTS)}.`,
      });
      return;
    }

    if (parsedWithdrawCents > wallet.available_cents) {
      toast.error("Insufficient available balance.");
      return;
    }

    if (!selectedMethodId) {
      toast.error("Please select a payout method.");
      return;
    }

    setIsWithdrawing(true);
    const res = await requestPayout(selectedMethodId, parsedWithdrawCents);
    setIsWithdrawing(false);

    if (res.error) {
      toast.error("Payout request failed", { description: res.error });
    } else {
      toast.success("Payout Requested", {
        description: `Your withdrawal of ${formatCents(parsedWithdrawCents)} has been submitted. Processing time is 1–3 business days. Track progress on the Payouts tab.`,
      });
      setWithdrawOpen(false);
      setActiveTab("payouts");
      router.refresh();
    }
  }

  // Handle Save Payout Method (Wise & Payoneer)
  async function handleSaveMethod(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingMethod(true);

    const payload = {
      type: methodType,
      email: accountEmail.trim(),
      label: methodLabel.trim() || undefined,
    };

    const res = await savePayoutMethod(payload);
    setIsSavingMethod(false);

    if (res.error) {
      toast.error("Could not save method", { description: res.error });
    } else {
      toast.success("Payout method saved", {
        description: "New methods are subject to a 48-hour authorization security period before withdrawals.",
      });
      setAddMethodOpen(false);
      setAccountEmail("");
      setMethodLabel("");
      router.refresh();
    }
  }

  // Handle Cancel Payout Request
  async function handleCancelPayout(payoutId: string) {
    if (!confirm("Are you sure you want to cancel this payout request? Your funds will be returned immediately to your available balance.")) {
      return;
    }

    setCancellingId(payoutId);
    const res = await cancelMyPayout(payoutId);
    setCancellingId(null);

    if (res.error) {
      toast.error("Could not cancel payout", { description: res.error });
    } else {
      toast.success("Payout cancelled", {
        description: "Funds returned to your available balance.",
      });
      router.refresh();
    }
  }

  // Handle Delete Payout Method
  async function handleDeleteMethod(methodId: string) {
    if (!confirm("Are you sure you want to remove this payout method?")) return;

    setDeletingMethodId(methodId);
    const res = await deletePayoutMethod(methodId);
    setDeletingMethodId(null);

    if (res.error) {
      toast.error("Failed to delete", { description: res.error });
    } else {
      toast.success("Payout method removed.");
      router.refresh();
    }
  }

  // Current active hourly task for timesheet
  const activeHourlyTask = hourlyTasks.find((t) => t.taskId === selectedHourlyTaskId) || hourlyTasks[0];
  const activeTaskTimeEntries = timeEntries.filter((e) => e.task_id === activeHourlyTask?.taskId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Earnings & Wallet
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time computed balance, immutable audit ledger, and disbursement history.
          </p>
        </div>

        {profile.payouts_blocked && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Withdrawals are currently paused on this account. Contact support.</span>
          </div>
        )}
      </div>

      {/* Top Row: 4 Balance Cards */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Available + Withdraw Button Beside */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Available</span>
            <Wallet className="h-4 w-4 text-[#0F766E]" />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F766E]">
                {formatCents(wallet.available_cents)}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Cleared of all holds
              </span>
            </div>

            <Button
              size="sm"
              disabled={!canWithdraw}
              onClick={() => {
                setWithdrawDollars((wallet.available_cents / 100).toFixed(2));
                setWithdrawOpen(true);
              }}
              className="w-fullrounded-full text-xs font-bold gap-1.5 h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>Withdraw</span>
            </Button>
          </div>

          <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            {!canWithdraw ? (
              <span className="text-muted-foreground/90 font-medium">
                {profile.payouts_blocked
                  ? "Withdrawals paused on this account."
                  : methods.length === 0
                  ? "Add a Wise or Payoneer method to enable withdrawals."
                  : wallet.available_cents < MIN_PAYOUT_CENTS
                  ? `Min withdrawal is ${formatCents(MIN_PAYOUT_CENTS)}.`
                  : "Withdrawals unavailable."}
              </span>
            ) : (
              <span>Ready for disbursement to Wise or Payoneer.</span>
            )}
          </div>
        </div>

        {/* Card 2: Pending Hold with Tooltip */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">Pending</span>
              <div className="relative group cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2.5 bg-popover text-popover-foreground text-[11px] rounded-lg shadow-lg border border-border leading-relaxed pointer-events-none">
                  Earnings clear into Available after the {HOLD_DAYS}-day review hold period.
                  {nextClearingDate && (
                    <span className="block mt-1.5 font-bold text-primary">
                      Next clearing date: {formatDate(nextClearingDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Clock className="h-4 w-4 text-[#B45309]" />
          </div>

          <div>
            <span className="font-heading font-extrabold text-2xl sm:text-3xl text-[#B45309]">
              {formatCents(wallet.pending_cents)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {nextClearingDate
                ? `Next clearing: ${formatDate(nextClearingDate)}`
                : `${HOLD_DAYS}-day post-approval quality hold`}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground leading-snug">
            Clears automatically after the {HOLD_DAYS}-day review hold.
          </div>
        </div>

        {/* Card 3: Lifetime Earned */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Lifetime Earned</span>
            <CheckCircle2 className="h-4 w-4 text-foreground" />
          </div>

          <div>
            <span className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground">
              {formatCents(wallet.lifetime_earned_cents)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Total work approvals & bonuses
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
            All historical earnings credited to profile.
          </div>
        </div>

        {/* Card 4: Paid Out */}
        <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Paid Out</span>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>

          <div>
            <span className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground">
              {formatCents(wallet.lifetime_paid_cents)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Disbursed to your accounts
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
            Net total paid out and completed.
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "activity", label: `Ledger Activity (${ledger.length})` },
          { id: "payouts", label: `Payout Requests (${payouts.length})` },
          { id: "methods", label: `Payout Methods (${methods.length})` },
          ...(hourlyTasks.length > 0
            ? [{ id: "timesheet", label: `Timesheet (${hourlyTasks.length} hourly ${hourlyTasks.length === 1 ? "task" : "tasks"})` }]
            : []),
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LEDGER ACTIVITY */}
      {activeTab === "activity" && (
        <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Kind Filters */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { id: "all", label: "All Activity" },
                  { id: "earning", label: "Earnings" },
                  { id: "payout", label: "Payouts" },
                  { id: "bonus", label: "Bonuses" },
                  { id: "adjustment", label: "Adjustments" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setKindFilter(pill.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      kindFilter === pill.id
                        ? "bg-muted text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Month Filter */}
              {availableMonths.length > 0 && (
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  aria-label="Filter by month"
                  className="h-7 rounded-full border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <option value="all">All Months</option>
                  {availableMonths.map((m) => {
                    const [y, mo] = m.split("-");
                    const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
                    const label = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
                    return (
                      <option key={m} value={m}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportLedgerCSV}
              className="rounded-full text-xs font-semibold gap-1.5 h-8 shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>

          <ResponsiveTable
            data={filteredLedger}
            keyExtractor={(entry) => entry.id}
            emptyMessage="No ledger activity recorded for this filter."
            columns={[
              {
                header: "Date",
                priority: "secondary",
                cell: (entry) => <span className="text-muted-foreground">{formatDate(entry.created_at)}</span>,
              },
              {
                header: "Description",
                priority: "primary",
                cell: (entry) => <span className="font-medium text-foreground break-words">{entry.note || "Task Evaluation"}</span>,
              },
              {
                header: "Kind",
                priority: "secondary",
                cell: (entry) => (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {entry.kind}
                  </span>
                ),
              },
              {
                header: "Amount",
                priority: "primary",
                cell: (entry) => {
                  const isCredit = entry.amount_cents > 0;
                  return (
                    <span className={`font-mono font-bold text-sm ${isCredit ? "text-[#0F766E]" : "text-destructive"}`}>
                      {isCredit ? "+" : ""}{formatCents(entry.amount_cents)}
                    </span>
                  );
                },
              },
              {
                header: "Available Date",
                priority: "secondary",
                cell: (entry) => <span className="text-muted-foreground">{formatDate(entry.available_at)}</span>,
              },
              {
                header: "Status",
                priority: "primary",
                align: "right",
                cell: (entry) => {
                  const isAvailable = new Date(entry.available_at).getTime() <= Date.now();
                  return isAvailable ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E]">
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                      Pending
                    </span>
                  );
                },
              },
            ]}
          />
        </div>
      )}

      {/* TAB 2: PAYOUT REQUESTS */}
      {activeTab === "payouts" && (
        <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-heading font-bold text-sm text-foreground">
              Withdrawal & Disbursement History ({payouts.length})
            </h3>
          </div>

          <ResponsiveTable
            data={payouts}
            keyExtractor={(req) => req.id}
            emptyMessage="No payout requests submitted yet."
            columns={[
              {
                header: "Requested Date",
                priority: "secondary",
                cell: (req) => <span className="text-muted-foreground">{formatDateTime(req.requested_at)}</span>,
              },
              {
                header: "Amount (USD)",
                priority: "primary",
                cell: (req) => <span className="font-mono font-bold text-sm text-foreground">{formatCents(req.amount_cents)}</span>,
              },
              {
                header: "Fee",
                priority: "secondary",
                cell: (req) => <span className="font-mono text-muted-foreground">{formatCents(req.fee_cents || 0)}</span>,
              },
              {
                header: "Payout Method",
                priority: "primary",
                cell: (req) => {
                  const method = req.method_snapshot;
                  return (
                    <div>
                      <span className="font-semibold text-foreground uppercase text-[11px]">
                        {method?.type || "Method"}
                      </span>
                      <span className="text-muted-foreground block text-[11px]">
                        {maskDetails(method?.type, method?.details)}
                      </span>
                    </div>
                  );
                },
              },
              {
                header: "Reference",
                priority: "secondary",
                cell: (req) => <span className="font-mono text-foreground/80">{req.provider_ref || "—"}</span>,
              },
              {
                header: "Status",
                priority: "primary",
                cell: (req) => (
                  req.status === "paid" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Paid
                    </span>
                  ) : req.status === "processing" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </span>
                  ) : req.status === "requested" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                      <Clock className="h-3 w-3" />
                      Requested
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                      <AlertCircle className="h-3 w-3" />
                      {req.status}
                    </span>
                  )
                ),
              },
              {
                header: "Actions",
                priority: "primary",
                align: "right",
                cell: (req) => {
                  const isCancelling = cancellingId === req.id;
                  if (req.status !== "requested") return null;
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isCancelling}
                      onClick={() => handleCancelPayout(req.id)}
                      className="h-8 touch-target text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      {isCancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
                    </Button>
                  );
                },
              },
            ]}
          />
        </div>
      )}

      {/* TAB 3: PAYOUT METHODS (WISE & PAYONEER) */}
      {activeTab === "methods" && (
        <div className="bg-card rounded-[14px] border border-border p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Configured Payout Methods
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add your Wise or Payoneer accounts to withdraw earnings in USD.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setAddMethodOpen(true)}
              className="rounded-full text-xs font-bold gap-1.5 h-8 px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Payout Method</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((m) => {
              const isDeleting = deletingMethodId === m.id;
              const isNew = new Date(m.created_at).getTime() > Date.now() - 48 * 3600 * 1000;

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.type === "wise" ? (
                          <Globe className="h-4 w-4 text-[#0F766E]" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-heading font-bold text-sm text-foreground uppercase">
                          {m.type}
                        </span>
                        {m.is_default && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Default
                          </span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDeleteMethod(m.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    <p className="font-mono text-xs font-semibold text-foreground">
                      {maskDetails(m.type, m.details)}
                    </p>

                    {m.label && (
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    )}
                  </div>

                  {isNew && (
                    <div className="p-2.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#78350F] text-[11px] leading-snug">
                      Security hold: This new payout method will be ready for withdrawals after 48 hours.
                    </div>
                  )}

                  {!m.is_default && (
                    <div className="pt-2 border-t border-border/50 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultPayoutMethod(m.id)}
                        className="h-6 text-[11px] font-semibold text-primary hover:underline p-0"
                      >
                        Set as default
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {methods.length === 0 && (
              <div className="col-span-full p-8 text-center border-2 border-dashed border-border rounded-xl space-y-3">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto" />
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground">No payout methods added</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add your Wise or Payoneer account to withdraw your earnings.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAddMethodOpen(true)}
                  className="rounded-full text-xs font-bold gap-1.5 h-8 px-4"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add First Method</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TIMESHEET (CONDITIONAL FOR HOURLY CONTRIBUTORS) */}
      {activeTab === "timesheet" && hourlyTasks.length > 0 && activeHourlyTask && (
        <div className="space-y-4">
          {hourlyTasks.length > 1 && (
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-foreground">Select Hourly Task:</span>
              <select
                value={selectedHourlyTaskId}
                onChange={(e) => setSelectedHourlyTaskId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer font-medium"
              >
                {hourlyTasks.map((t) => (
                  <option key={t.taskId} value={t.taskId}>
                    {t.title} ({formatCents(t.rateCents)}/hr)
                  </option>
                ))}
              </select>
            </div>
          )}

          <TimesheetView
            taskId={activeHourlyTask.taskId}
            slug={activeHourlyTask.slug}
            rateCents={activeHourlyTask.rateCents}
            entries={activeTaskTimeEntries}
          />
        </div>
      )}

      {/* WITHDRAW MODAL */}
      <ResponsiveDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Withdraw Available Earnings"
        description="Disburse your cleared balance to your verified Wise or Payoneer account."
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWithdrawOpen(false)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="withdraw-form"
              disabled={isWithdrawing || parsedWithdrawCents < MIN_PAYOUT_CENTS}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-10 touch-target"
            >
              {isWithdrawing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              )}
              <span>Confirm Withdrawal</span>
            </Button>
          </div>
        }
      >
        <form id="withdraw-form" onSubmit={handleRequestPayout} className="space-y-4 pt-1">
          {/* Payout Method Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Destination Method</Label>
            <select
              value={selectedMethodId}
              onChange={(e) => setSelectedMethodId(e.target.value)}
              className="w-full h-10 min-h-[44px] rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.type.toUpperCase()}: {maskDetails(m.type, m.details)} {m.is_default ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input (Prefilled with Available, Minimum $25.00) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="withdraw_dollars" className="text-xs font-semibold">
                Amount (USD)
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Available: {formatCents(wallet.available_cents)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                $
              </span>
              <Input
                id="withdraw_dollars"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="25.00"
                max={(wallet.available_cents / 100).toFixed(2)}
                value={withdrawDollars}
                onChange={(e) => setWithdrawDollars(e.target.value)}
                className="pl-7 text-base sm:text-xs h-10 min-h-[44px] bg-background font-mono font-bold"
                required
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Minimum withdrawal amount is {formatCents(MIN_PAYOUT_CENTS)}.
            </span>
          </div>

          {/* Calculations Breakdown */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Platform Processing Fee</span>
              <span className="font-mono font-semibold text-foreground">$0.00 (Free)</span>
            </div>
            <div className="flex items-center justify-between font-bold text-foreground pt-1 border-t border-border/50">
              <span>Net Disbursement</span>
              <span className="font-mono text-[#0F766E] text-sm">
                {formatCents(parsedWithdrawCents)} USD
              </span>
            </div>
            <div className="space-y-1 pt-1 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Funds will be disbursed in USD directly to your selected payout account. Wise or Payoneer converts to your local currency upon arrival if requested.
              </p>
              <p className="text-[10px] font-semibold text-foreground/80">
                Processing timeline: 1 to 3 business days.
              </p>
            </div>
          </div>
        </form>
      </ResponsiveDialog>

      {/* ADD PAYOUT METHOD MODAL (WISE & PAYONEER) */}
      <ResponsiveDialog
        open={addMethodOpen}
        onOpenChange={setAddMethodOpen}
        title="Add Payout Destination"
        description="Configure a verified Wise or Payoneer account to receive earnings."
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddMethodOpen(false)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-method-form"
              disabled={isSavingMethod}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-10 touch-target"
            >
              {isSavingMethod ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Save Method</span>
            </Button>
          </div>
        }
      >
        <form id="add-method-form" onSubmit={handleSaveMethod} className="space-y-4 pt-1">
          {/* Method Type Pills: Wise vs Payoneer */}
          <div className="flex items-center gap-2">
            {[
              { id: "wise", label: "Wise" },
              { id: "payoneer", label: "Payoneer" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethodType(m.id as any)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-target ${
                  methodType === m.id
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account_email" className="text-xs font-semibold">
              {methodType === "wise" ? "Wise" : "Payoneer"} Account Email *
            </Label>
            <Input
              id="account_email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              required
              className="text-base sm:text-xs h-10 min-h-[44px] bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method_label" className="text-xs font-semibold">
              Label / Nickname (Optional)
            </Label>
            <Input
              id="method_label"
              placeholder="e.g. Primary USD receiving account"
              value={methodLabel}
              onChange={(e) => setMethodLabel(e.target.value)}
              className="text-base sm:text-xs h-10 min-h-[44px] bg-background"
            />
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground">
            Security notice: For your account protection, new payout methods require a 48-hour authorization hold before withdrawals can be initiated.
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
