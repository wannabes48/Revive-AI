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
} from "@/lib/supabase/types";
import {
  savePayoutMethod,
  deletePayoutMethod,
  setDefaultPayoutMethod,
  cancelMyPayout,
} from "@/actions/payouts";
import {
  formatCents,
  formatDate,
  formatDateTime,
  maskDetails,
} from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  Wallet,
  Clock,
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

interface EarningsViewProps {
  wallet: WalletBalance;
  ledger: LedgerEntry[];
  payouts: PayoutRequest[];
  methods: PayoutMethod[];
  profile: Profile;
}

type TabType = "activity" | "payouts" | "methods";

export function EarningsView({
  wallet,
  ledger,
  payouts,
  methods,
  profile,
}: EarningsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state (support query param ?tab=)
  const initialTab = searchParams.get("tab") as TabType;
  const [activeTab, setActiveTab] = React.useState<TabType>(
    initialTab && ["activity", "payouts", "methods"].includes(initialTab)
      ? initialTab
      : "activity"
  );

  // Filter state for activity tab
  const [kindFilter, setKindFilter] = React.useState<string>("all");
  const [monthFilter, setMonthFilter] = React.useState<string>("all");

  // Add Method Modal State (Wise & Payoneer)
  const [addMethodOpen, setAddMethodOpen] = React.useState(false);
  const [methodType, setMethodType] = React.useState<"wise" | "payoneer">("wise");
  const [accountEmail, setAccountEmail] = React.useState("");
  const [methodLabel, setMethodLabel] = React.useState("");
  const [isSavingMethod, setIsSavingMethod] = React.useState(false);

  // Action loaders
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = React.useState<string | null>(null);

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

  // Payouts are released every two weeks — there is no manual withdrawal.
  const awaitingCents = Math.max(0, wallet.available_cents + wallet.pending_cents);
  const lastPaidPayout = payouts.find((p) => p.status === "paid") || null;
  const payoutNotice = profile.payouts_blocked
    ? "Payouts are paused on this account — please contact support."
    : methods.length === 0
    ? "Add a Wise or Payoneer payout method so we can send your funds."
    : null;

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
        description: "New methods are subject to a 48-hour authorization security period before they receive payouts.",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Earnings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            What you&apos;re owed, what you&apos;ve been paid, and how you earned it.
          </p>
        </div>

        {profile.payouts_blocked && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Payouts are currently paused on this account. Contact support.</span>
          </div>
        )}
      </div>

      {/* Balance cards: awaiting payout (pending + available) and total paid out */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-[18px] border border-[#0F766E]/25 bg-gradient-to-br from-[#F0FDFA] via-card to-card p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">Awaiting payout</span>
            <div className="w-9 h-9 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shadow-xs">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>

          <div>
            <span className="font-heading font-black text-4xl sm:text-5xl tracking-tight text-[#0F766E]">
              {formatCents(awaitingCents)}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              All approved earnings and bonuses that haven&apos;t been paid out yet.
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[#0F766E]/5 border border-[#0F766E]/15 px-3.5 py-2.5 text-xs text-foreground">
            <Calendar className="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" />
            <span>
              Funds are released <strong>every two weeks</strong> to your default payout method. No
              withdrawal request is needed.
              {payoutNotice && (
                <span className="block mt-1 font-semibold text-[#B45309]">{payoutNotice}</span>
              )}
            </span>
          </div>
        </div>

        <div className="rounded-[18px] border border-border bg-card p-5 sm:p-6 shadow-2xs flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total paid out</span>
            <div className="w-9 h-9 rounded-xl bg-muted text-foreground flex items-center justify-center">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>

          <div>
            <span className="font-heading font-black text-4xl sm:text-5xl tracking-tight text-foreground">
              {formatCents(wallet.lifetime_paid_cents)}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Sent to your payout accounts since you joined.
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border/60 px-3.5 py-2.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" />
            <span>
              {lastPaidPayout
                ? `Last payout: ${formatCents(lastPaidPayout.amount_cents)} on ${formatDate(
                    lastPaidPayout.processed_at || lastPaidPayout.requested_at
                  )}`
                : "Your first payout will appear here once it's sent."}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "activity", label: `Ledger Activity (${ledger.length})` },
          { id: "payouts", label: `Payout History (${payouts.length})` },
          { id: "methods", label: `Payout Methods (${methods.length})` },
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
              Payout & Disbursement History ({payouts.length})
            </h3>
          </div>

          <ResponsiveTable
            data={payouts}
            keyExtractor={(req) => req.id}
            emptyMessage="No payouts yet. Funds are released every two weeks."
            columns={[
              {
                header: "Date",
                priority: "secondary",
                cell: (req) => <span className="text-muted-foreground">{formatDateTime(req.processed_at || req.requested_at)}</span>,
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
                Add your Wise or Payoneer account to receive your biweekly payouts in USD.
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
                      Security hold: This new payout method will be ready to receive payouts after 48 hours.
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
                    Add your Wise or Payoneer account to receive your earnings every two weeks.
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
            Security notice: For your account protection, new payout methods require a 48-hour authorization hold before they can receive payouts.
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
