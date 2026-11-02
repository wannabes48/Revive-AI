"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayoutRequest, PayoutStatus, Profile } from "@/lib/supabase/types";
import { adminProcessPayout, adminTogglePayoutsBlocked } from "@/actions/admin-work";
import { formatDate, formatDateTime, formatCents, maskDetails } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Download,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User,
  Smartphone,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export interface AdminPayoutRow extends Omit<PayoutRequest, "profile"> {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    created_at: string;
    payouts_blocked: boolean;
  };
  contributorStats: {
    approvedCount: number;
    approvalRate: number;
    otherPayoutsCount: number;
    isMethodShared: boolean;
  };
}

interface PayoutQueueProps {
  payouts: AdminPayoutRow[];
}

export function PayoutQueue({ payouts: initialPayouts }: PayoutQueueProps) {
  const router = useRouter();

  const [payouts, setPayouts] = React.useState<AdminPayoutRow[]>(initialPayouts);
  const [activeTab, setActiveTab] = React.useState<PayoutStatus | "all">("requested");

  // Expanded row id
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Action dialogs
  const [markPaidDialog, setMarkPaidDialog] = React.useState<{ payout: AdminPayoutRow } | null>(null);
  const [providerRef, setProviderRef] = React.useState("");
  const [isMarkingPaid, setIsMarkingPaid] = React.useState(false);

  const [failDialog, setFailDialog] = React.useState<{ payout: AdminPayoutRow } | null>(null);
  const [failReason, setFailReason] = React.useState("");
  const [isFailing, setIsFailing] = React.useState(false);

  // Selection for CSV batch export
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Filtered rows
  const filteredPayouts = React.useMemo(() => {
    if (activeTab === "all") return payouts;
    return payouts.filter((p) => p.status === activeTab);
  }, [payouts, activeTab]);

  // Handle Mark Processing
  async function handleMarkProcessing(payoutId: string) {
    const res = await adminProcessPayout(payoutId, "processing");
    if (res.error) {
      toast.error("Could not update status", { description: res.error });
    } else {
      toast.success("Payout marked as Processing.");
      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: "processing" } : p))
      );
      router.refresh();
    }
  }

  // Handle Mark Paid
  async function handleConfirmMarkPaid(e: React.FormEvent) {
    e.preventDefault();
    if (!markPaidDialog) return;

    if (!providerRef.trim()) {
      toast.error("Provider reference (e.g. Wise transfer ID or Payoneer reference) is required.");
      return;
    }

    setIsMarkingPaid(true);
    const res = await adminProcessPayout(
      markPaidDialog.payout.id,
      "paid",
      markPaidDialog.payout.method_snapshot.type,
      providerRef.trim()
    );
    setIsMarkingPaid(false);

    if (res.error) {
      toast.error("Failed to mark as paid", { description: res.error });
    } else {
      toast.success("Payout marked Paid! Notification delivered to contributor.");
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === markPaidDialog.payout.id
            ? { ...p, status: "paid", provider_ref: providerRef.trim() }
            : p
        )
      );
      setMarkPaidDialog(null);
      setProviderRef("");
      router.refresh();
    }
  }

  // Handle Fail / Cancel
  async function handleConfirmFail(e: React.FormEvent) {
    e.preventDefault();
    if (!failDialog) return;

    if (!failReason.trim()) {
      toast.error("A reason for failure/cancellation is required.");
      return;
    }

    setIsFailing(true);
    const res = await adminProcessPayout(
      failDialog.payout.id,
      "failed",
      undefined,
      undefined,
      failReason.trim()
    );
    setIsFailing(false);

    if (res.error) {
      toast.error("Action failed", { description: res.error });
    } else {
      toast.success("Payout marked Failed. Funds returned to contributor's balance.");
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === failDialog.payout.id
            ? { ...p, status: "failed", failure_reason: failReason.trim() }
            : p
        )
      );
      setFailDialog(null);
      setFailReason("");
      router.refresh();
    }
  }

  // Handle Toggle Payouts Blocked
  async function handleToggleBlocked(userId: string, currentBlocked: boolean) {
    const nextState = !currentBlocked;
    const res = await adminTogglePayoutsBlocked(userId, nextState);
    if (res.error) {
      toast.error("Could not update restriction", { description: res.error });
    } else {
      toast.success(nextState ? "Withdrawals blocked for user." : "Withdrawals unblocked.");
      setPayouts((prev) =>
        prev.map((p) =>
          p.user_id === userId
            ? { ...p, profile: { ...p.profile, payouts_blocked: nextState } }
            : p
        )
      );
      router.refresh();
    }
  }

  // Export Selected / Filtered CSV
  function handleExportCSV() {
    const targets =
      selectedIds.size > 0
        ? payouts.filter((p) => selectedIds.has(p.id))
        : filteredPayouts;

    if (targets.length === 0) {
      toast.error("No payout requests to export.");
      return;
    }

    const headers = [
      "Request ID",
      "Contributor Name",
      "Email",
      "Method Type",
      "Method Details",
      "Amount USD",
      "Status",
      "Requested Date",
    ];

    const rows = targets.map((p) => [
      p.id,
      `"${(p.profile.full_name || "").replace(/"/g, '""')}"`,
      p.profile.email,
      p.method_snapshot.type,
      `"${JSON.stringify(p.method_snapshot.details).replace(/"/g, '""')}"`,
      (p.amount_cents / 100).toFixed(2),
      p.status,
      new Date(p.requested_at).toISOString().split("T")[0],
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ReviveAI_Payouts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Payout Disbursements Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit withdrawal requests, verify recipient channels, and disburse via Wise or Payoneer.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="rounded-full text-xs font-semibold gap-1.5 h-8 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Batch CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
        </Button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "requested", label: "Requested (Pending Action)" },
          { id: "processing", label: "Processing (In Flight)" },
          { id: "paid", label: "Paid & Settled" },
          { id: "failed", label: "Failed / Cancelled" },
          { id: "all", label: "All Requests" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const count =
            tab.id === "all" ? payouts.length : payouts.filter((p) => p.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Payouts Table */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        {filteredPayouts.length > 0 ? (
          <>
            {/* Mobile Stacked Cards (below md) */}
            <div className="divide-y divide-border/60 md:hidden">
              {filteredPayouts.map((payout) => {
                const isExpanded = expandedId === payout.id;
                const isChecked = selectedIds.has(payout.id);
                const method = payout.method_snapshot;
                const daysWaiting = Math.floor(
                  (Date.now() - new Date(payout.requested_at).getTime()) / (1000 * 3600 * 24)
                );

                return (
                  <div
                    key={`mobile-${payout.id}`}
                    className={`p-4 space-y-3 transition-colors ${
                      isExpanded ? "bg-primary/5 border-l-4 border-l-primary" : ""
                    }`}
                  >
                    {/* Top Row: Checkbox, Contributor & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(payout.id);
                            else next.delete(payout.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground text-sm truncate">
                              {payout.profile.full_name || payout.profile.email}
                            </span>
                            {payout.profile.payouts_blocked && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                Blocked
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs block truncate">
                            {payout.profile.email}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {payout.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </span>
                        ) : payout.status === "processing" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing
                          </span>
                        ) : payout.status === "requested" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                            <Clock className="h-3 w-3" />
                            Requested
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                            <AlertCircle className="h-3 w-3" />
                            {payout.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financial & Channel Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/50">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Amount / Fee</span>
                        <span className="font-mono font-bold text-sm text-foreground">
                          {formatCents(payout.amount_cents)}
                        </span>
                        <span className="font-mono text-muted-foreground text-[11px] block">
                          Fee: {formatCents(payout.fee_cents || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Channel / Date</span>
                        <span className="font-semibold uppercase text-foreground text-xs block">
                          {method?.type}
                        </span>
                        <span className="text-muted-foreground text-[11px] block truncate">
                          {maskDetails(method?.type, method?.details)}
                        </span>
                        <span className="text-muted-foreground text-[10px] block mt-0.5">
                          {formatDate(payout.requested_at)}
                          {payout.status === "requested" && daysWaiting > 0 && ` (${daysWaiting}d waiting)`}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {payout.status === "requested" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkProcessing(payout.id)}
                            className="min-h-[44px] px-3 text-xs font-semibold rounded-full"
                          >
                            Process
                          </Button>
                        )}

                        {(payout.status === "requested" || payout.status === "processing") && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setMarkPaidDialog({ payout })}
                              className="min-h-[44px] px-3 text-xs font-semibold rounded-full bg-[#0F766E] text-white hover:bg-[#0D655E]"
                            >
                              Mark Paid
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFailDialog({ payout })}
                              className="min-h-[44px] px-3 text-xs font-semibold rounded-full text-destructive hover:bg-destructive/10"
                            >
                              Fail
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : payout.id)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-full text-muted-foreground ml-auto"
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Expanded Mobile Drawer for Fraud & Risk Signals */}
                    {isExpanded && (
                      <div className="pt-2 space-y-3 border-t border-border/70 text-xs">
                        <div className="p-3 rounded-lg border border-border bg-card space-y-1 font-mono">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Payout Channel Details
                          </span>
                          <p className="font-bold text-foreground">
                            Type: {payout.method_snapshot.type.toUpperCase()}
                          </p>
                          {Object.entries(payout.method_snapshot.details || {}).map(([k, v]) => (
                            <p key={k} className="text-foreground/90 break-words">
                              {k}: <strong>{String(v)}</strong>
                            </p>
                          ))}
                          {payout.provider_ref && (
                            <p className="text-[#0F766E] font-bold pt-1 break-words">
                              Receipt Ref: {payout.provider_ref}
                            </p>
                          )}
                          {payout.failure_reason && (
                            <p className="text-destructive font-bold pt-1 break-words">
                              Failure: {payout.failure_reason}
                            </p>
                          )}
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Risk & Vetting Signals
                          </span>
                          <div className="flex items-center justify-between">
                            <span>Account Age:</span>
                            <span className="font-semibold text-foreground">
                              Joined {formatDate(payout.profile.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Approval Rate:</span>
                            <span className="font-semibold text-[#0F766E]">
                              {payout.contributorStats.approvalRate}% ({payout.contributorStats.approvedCount} approved)
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Lifetime Payouts:</span>
                            <span className="font-semibold text-foreground">
                              {payout.contributorStats.otherPayoutsCount} completed
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-border/50">
                            <span>Shared Channel:</span>
                            <span
                              className={`font-bold ${
                                payout.contributorStats.isMethodShared
                                  ? "text-destructive"
                                  : "text-[#0F766E]"
                              }`}
                            >
                              {payout.contributorStats.isMethodShared
                                ? "WARNING: Shared by multiple accounts"
                                : "Unique to this user"}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                          <Button
                            size="sm"
                            variant={payout.profile.payouts_blocked ? "default" : "destructive"}
                            onClick={() =>
                              handleToggleBlocked(payout.user_id, payout.profile.payouts_blocked)
                            }
                            className="w-full min-h-[44px] rounded-full text-xs font-bold gap-1.5"
                          >
                            <ShieldAlert className="h-4 w-4" />
                            <span>
                              {payout.profile.payouts_blocked
                                ? "Unblock Contributor Withdrawals"
                                : "Block Contributor Withdrawals"}
                            </span>
                          </Button>

                          <Link href={`/admin/users/${payout.user_id}`} target="_blank">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full min-h-[44px] rounded-full text-xs font-semibold gap-1.5"
                            >
                              <span>Open User Dossier</span>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredPayouts.length && filteredPayouts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredPayouts.map((p) => p.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                  </th>
                  <th className="py-3 px-4">Contributor</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Fee</th>
                  <th className="py-3 px-4">Destination Channel</th>
                  <th className="py-3 px-4">Requested</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPayouts.map((payout) => {
                  const isExpanded = expandedId === payout.id;
                  const isChecked = selectedIds.has(payout.id);
                  const method = payout.method_snapshot;
                  const daysWaiting = Math.floor(
                    (Date.now() - new Date(payout.requested_at).getTime()) / (1000 * 3600 * 24)
                  );

                  return (
                    <React.Fragment key={payout.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : payout.id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(payout.id);
                              else next.delete(payout.id);
                              setSelectedIds(next);
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {payout.profile.full_name || payout.profile.email}
                            </span>
                            {payout.profile.payouts_blocked && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                Blocked
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-[11px] block">
                            {payout.profile.email}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-sm text-foreground">
                          {formatCents(payout.amount_cents)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-muted-foreground">
                          {formatCents(payout.fee_cents || 0)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold uppercase text-foreground text-[11px]">
                            {method?.type}
                          </span>
                          <span className="text-muted-foreground text-[11px] block">
                            {maskDetails(method?.type, method?.details)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                          <span>{formatDate(payout.requested_at)}</span>
                          {payout.status === "requested" && daysWaiting > 0 && (
                            <span className="text-[11px] font-bold text-[#B45309] block">
                              {daysWaiting}d waiting
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {payout.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                          ) : payout.status === "processing" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Processing
                            </span>
                          ) : payout.status === "requested" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                              <Clock className="h-3 w-3" />
                              Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                              <AlertCircle className="h-3 w-3" />
                              {payout.status}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {payout.status === "requested" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkProcessing(payout.id)}
                                className="h-7 text-xs font-semibold rounded-full"
                              >
                                Process
                              </Button>
                            )}

                            {(payout.status === "requested" || payout.status === "processing") && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setMarkPaidDialog({ payout })}
                                  className="h-7 text-xs font-semibold rounded-full bg-[#0F766E] text-white hover:bg-[#0D655E]"
                                >
                                  Mark Paid
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFailDialog({ payout })}
                                  className="h-7 text-xs font-semibold rounded-full text-destructive hover:bg-destructive/10"
                                >
                                  Fail
                                </Button>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : payout.id)}
                              className="h-7 w-7 p-0 rounded-full text-muted-foreground"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Fraud & Contributor Detail Drawer Row */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b border-border/80">
                          <td colSpan={8} className="p-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                              {/* Panel 1: Full Destination Info */}
                              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                  Full Payout Channel Details
                                </span>
                                <div className="space-y-1 font-mono">
                                  <p className="font-bold text-foreground">
                                    Type: {payout.method_snapshot.type.toUpperCase()}
                                  </p>
                                  {Object.entries(payout.method_snapshot.details || {}).map(([k, v]) => (
                                    <p key={k} className="text-foreground/90">
                                      {k}: <strong>{String(v)}</strong>
                                    </p>
                                  ))}
                                  {payout.provider_ref && (
                                    <p className="text-[#0F766E] font-bold pt-1">
                                      Receipt Reference: {payout.provider_ref}
                                    </p>
                                  )}
                                  {payout.failure_reason && (
                                    <p className="text-destructive font-bold pt-1">
                                      Failure Reason: {payout.failure_reason}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Panel 2: Fraud & Risk Signals */}
                              <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                  Risk & Vetting Signals
                                </span>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span>Account Age:</span>
                                    <span className="font-semibold text-foreground">
                                      Joined {formatDate(payout.profile.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Approval Rate:</span>
                                    <span className="font-semibold text-[#0F766E]">
                                      {payout.contributorStats.approvalRate}% ({payout.contributorStats.approvedCount} approved)
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Other Lifetime Payouts:</span>
                                    <span className="font-semibold text-foreground">
                                      {payout.contributorStats.otherPayoutsCount} completed
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                    <span>Shared Payout Channel:</span>
                                    <span
                                      className={`font-bold ${
                                        payout.contributorStats.isMethodShared
                                          ? "text-destructive"
                                          : "text-[#0F766E]"
                                      }`}
                                    >
                                      {payout.contributorStats.isMethodShared
                                        ? "⚠️ Shared with another account!"
                                        : "Unique to this user"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Panel 3: Account Actions */}
                              <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Contributor Controls
                                  </span>
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    Lock future withdrawals if suspicious multi-accounting or fraudulent claims are identified.
                                  </p>
                                </div>

                                <div className="space-y-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant={payout.profile.payouts_blocked ? "default" : "destructive"}
                                    onClick={() =>
                                      handleToggleBlocked(payout.user_id, payout.profile.payouts_blocked)
                                    }
                                    className="w-full rounded-full text-xs font-bold gap-1.5 h-8"
                                  >
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    <span>
                                      {payout.profile.payouts_blocked
                                        ? "Unblock Contributor Withdrawals"
                                        : "Block Contributor Withdrawals"}
                                    </span>
                                  </Button>

                                  <Link href={`/admin/users/${payout.user_id}`} target="_blank">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full rounded-full text-xs font-semibold gap-1.5 h-8"
                                    >
                                      <span>Open User Dossier</span>
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        ) : (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <CreditCard className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="font-bold text-foreground">No payout requests in this view</p>
          </div>
        )}
      </div>

      {/* MARK PAID DIALOG */}
      <ResponsiveDialog
        open={Boolean(markPaidDialog)}
        onOpenChange={(open) => !open && setMarkPaidDialog(null)}
        title="Confirm Disbursement & Settle Payout"
        description="Enter the provider transaction code (e.g. Wise transfer ID or Payoneer payment ID)."
        footer={
          markPaidDialog && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMarkPaidDialog(null)}
                className="rounded-full text-xs h-10 touch-target"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="mark-paid-form"
                disabled={isMarkingPaid || !providerRef.trim()}
                className="rounded-full text-xs font-bold gap-1.5 bg-[#0F766E] text-white hover:bg-[#0D655E] h-10 touch-target"
              >
                {isMarkingPaid ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Settle as Paid</span>
              </Button>
            </div>
          )
        }
      >
        {markPaidDialog && (
          <form id="mark-paid-form" onSubmit={handleConfirmMarkPaid} className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contributor:</span>
                <span className="font-semibold text-foreground">
                  {markPaidDialog.payout.profile.full_name || markPaidDialog.payout.profile.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Amount:</span>
                <span className="font-mono font-bold text-[#0F766E]">
                  {formatCents(markPaidDialog.payout.amount_cents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-mono text-foreground">
                  {markPaidDialog.payout.method_snapshot.type.toUpperCase()}:{" "}
                  {maskDetails(
                    markPaidDialog.payout.method_snapshot.type,
                    markPaidDialog.payout.method_snapshot.details
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider_ref" className="text-xs font-semibold">
                Provider Transaction Reference Code *
              </Label>
              <Input
                id="provider_ref"
                placeholder="e.g. TR-98231412 (Wise Transfer ID)"
                value={providerRef}
                onChange={(e) => setProviderRef(e.target.value)}
                required
                className="text-base sm:text-xs h-10 min-h-[44px] bg-background font-mono font-bold"
              />
            </div>
          </form>
        )}
      </ResponsiveDialog>

      {/* FAIL / CANCEL DIALOG */}
      <ResponsiveDialog
        open={Boolean(failDialog)}
        onOpenChange={(open) => !open && setFailDialog(null)}
        title="Fail Payout & Return Funds"
        description="A reversal credit will be created immediately in the ledger, returning funds to the contributor's available balance."
        footer={
          failDialog && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFailDialog(null)}
                className="rounded-full text-xs h-10 touch-target"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="fail-payout-form"
                variant="destructive"
                disabled={isFailing || !failReason.trim()}
                className="rounded-full text-xs font-bold gap-1.5 h-10 touch-target"
              >
                {isFailing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                <span>Fail & Reverse Funds</span>
              </Button>
            </div>
          )
        }
      >
        {failDialog && (
          <form id="fail-payout-form" onSubmit={handleConfirmFail} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="fail_reason" className="text-xs font-semibold">
                Failure / Cancellation Reason *
              </Label>
              <Textarea
                id="fail_reason"
                placeholder="e.g. Beneficiary account email was invalid or rejected by Wise."
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                required
                rows={3}
                className="text-base sm:text-xs bg-background"
              />
            </div>
          </form>
        )}
      </ResponsiveDialog>
    </div>
  );
}
