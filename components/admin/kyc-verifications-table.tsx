"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  adminOverrideKycStatus,
  adminResetKyc,
  adminDeleteKycVerification,
} from "@/actions/admin-kyc";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Users,
  Loader2,
  Trash2,
  RefreshCw,
  Globe,
  FileText,
  Activity,
  RotateCcw,
  Shield,
  Fingerprint,
} from "lucide-react";

export interface KycVerificationRow {
  id: string;
  user_id: string;
  session_id: string;
  event_id?: string | null;
  webhook_type?: string | null;
  workflow_id?: string | null;
  status: string;
  decision?: string | null;
  document_type?: string | null;
  country_code?: string | null;
  vendor_data?: string | null;
  verified_at?: string | null;
  decline_reasons?: string[] | null;
  warnings?: any;
  ip_risk_score?: number | null;
  liveness_passed?: boolean | null;
  aml_passed?: boolean | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  raw_payload?: any;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    kyc_status?: string | null;
  } | null;
}

interface KycVerificationsTableProps {
  verifications: KycVerificationRow[];
}

export function KycVerificationsTable({ verifications }: KycVerificationsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Inspector Dialog state
  const [inspectRow, setInspectRow] = React.useState<KycVerificationRow | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const handleStatusChange = async (
    row: KycVerificationRow,
    newStatus: "verified" | "pending" | "in_progress" | "rejected" | "expired" | "resubmitted"
  ) => {
    setLoadingId(row.id);
    const res = await adminOverrideKycStatus(row.id, row.user_id, newStatus);
    setLoadingId(null);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || `KYC status updated to ${newStatus}.`);
      router.refresh();
    }
  };

  const handleReset = async (row: KycVerificationRow) => {
    if (
      !confirm(
        `Reset KYC verification for fellow ${row.profile?.full_name || row.profile?.email || row.user_id}? This will prompt them to restart verification.`
      )
    ) {
      return;
    }
    setLoadingId(row.id);
    const res = await adminResetKyc(row.user_id);
    setLoadingId(null);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "KYC session reset.");
      router.refresh();
    }
  };

  const handleDelete = async (row: KycVerificationRow) => {
    if (!confirm("Are you sure you want to remove this verification audit record?")) return;
    setLoadingId(row.id);
    const res = await adminDeleteKycVerification(row.id);
    setLoadingId(null);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Record deleted.");
      router.refresh();
    }
  };

  // Status classifier helper
  const classifyStatus = (status?: string | null, decision?: string | null) => {
    const s = (status || "").toLowerCase();
    const d = (decision || "").toLowerCase();

    if (s === "verified" || d === "approved") return "completed";
    if (s === "in_progress" || s === "resubmitted" || d.includes("progress")) return "ongoing";
    if (s === "pending" || s === "in_review" || d === "in review") return "pending";
    if (s === "rejected" || s === "declined" || d.includes("declin")) return "declined";
    if (s === "expired" || s === "abandoned" || d.includes("expir") || d.includes("abandon"))
      return "expired";
    return "pending";
  };

  // Filtered dataset
  const filtered = React.useMemo(() => {
    return verifications.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const name = row.profile?.full_name?.toLowerCase() || "";
      const email = row.profile?.email?.toLowerCase() || "";
      const session = row.session_id?.toLowerCase() || "";
      const event = row.event_id?.toLowerCase() || "";
      const doc = row.document_type?.toLowerCase() || "";
      const country = row.country_code?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        session.includes(q) ||
        event.includes(q) ||
        doc.includes(q) ||
        country.includes(q);

      const category = classifyStatus(row.status, row.decision);
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "completed" && category === "completed") ||
        (statusFilter === "pending" && category === "pending") ||
        (statusFilter === "ongoing" && category === "ongoing") ||
        (statusFilter === "declined" && category === "declined") ||
        (statusFilter === "expired" && category === "expired");

      return matchesSearch && matchesFilter;
    });
  }, [verifications, searchQuery, statusFilter]);

  // Aggregate Metrics across All KYC Sessions
  const totalCount = verifications.length;
  const completedCount = verifications.filter(
    (v) => classifyStatus(v.status, v.decision) === "completed"
  ).length;
  const pendingCount = verifications.filter(
    (v) => classifyStatus(v.status, v.decision) === "pending"
  ).length;
  const ongoingCount = verifications.filter(
    (v) => classifyStatus(v.status, v.decision) === "ongoing"
  ).length;
  const declinedCount = verifications.filter(
    (v) => classifyStatus(v.status, v.decision) === "declined"
  ).length;
  const expiredCount = verifications.filter(
    (v) => classifyStatus(v.status, v.decision) === "expired"
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Sessions
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-foreground">
            {totalCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">
            All Didit + audit records
          </span>
        </div>

        {/* Completed / Verified */}
        <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            Completed (Verified)
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-700 dark:text-emerald-400">
            {completedCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">Unlocked for work</span>
        </div>

        {/* Pending Review */}
        <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            Pending Review
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-amber-700 dark:text-amber-400">
            {pendingCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">Requires review / sign-off</span>
        </div>

        {/* Ongoing / Active */}
        <div className="p-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
            Ongoing / In Progress
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-blue-700 dark:text-blue-400">
            {ongoingCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">Active session / draft</span>
        </div>

        {/* Declined / Expired */}
        <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Declined & Expired
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-rose-700 dark:text-rose-400">
            {declinedCount + expiredCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">
            {declinedCount} declined • {expiredCount} expired
          </span>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by fellow name, email, Didit session ID, or document..."
            className="pl-9 h-10 text-xs rounded-xl bg-background border-border"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All (${totalCount})` },
            { id: "completed", label: `Completed (${completedCount})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "ongoing", label: `Ongoing (${ongoingCount})` },
            { id: "declined", label: `Declined (${declinedCount})` },
            { id: "expired", label: `Expired (${expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? "bg-[#0F766E] text-white shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Responsive Table / Cards */}
      <ResponsiveTable
        data={filtered}
        keyExtractor={(row) => row.id}
        emptyMessage={
          <div className="p-8 text-center space-y-2">
            <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-heading font-bold text-foreground">
              No verification sessions found
            </h4>
            <p className="text-xs text-muted-foreground">
              No KYC verification records match the selected filter query.
            </p>
          </div>
        }
        columns={[
          {
            header: "Contributor Profile",
            priority: "primary",
            cell: (row) => {
              const displayName =
                row.profile?.full_name || row.profile?.email?.split("@")[0] || "Contributor";
              const email = row.profile?.email || "No email";
              return (
                <div className="flex items-center gap-3 max-w-xs">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                    {row.profile?.avatar_url ? (
                      <img
                        src={row.profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <Link
                      href={`/admin/users?user=${row.user_id}`}
                      className="font-semibold text-foreground text-xs hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>{displayName}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
                    </Link>
                    <div className="text-[11px] text-muted-foreground truncate">{email}</div>
                  </div>
                </div>
              );
            },
          },
          {
            header: "Session & Event",
            priority: "secondary",
            cell: (row) => (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                    Didit.me
                  </span>
                  {row.webhook_type && (
                    <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-muted">
                      {row.webhook_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[140px]" title={row.session_id}>
                    {row.session_id}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(row.session_id, row.id);
                    }}
                    className="p-1 hover:text-foreground rounded cursor-pointer"
                    title="Copy Session ID"
                  >
                    {copiedId === row.id ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ),
          },
          {
            header: "Document & Checks",
            priority: "secondary",
            cell: (row) => (
              <div className="space-y-1 text-xs">
                <div className="font-medium text-foreground capitalize flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{row.document_type?.replace(/_/g, " ") || "Government ID"}</span>
                  {row.country_code && (
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      ({row.country_code})
                    </span>
                  )}
                </div>
                {/* V3 verification indicators */}
                <div className="flex items-center gap-1 text-[10px]">
                  {row.liveness_passed !== null && row.liveness_passed !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        row.liveness_passed
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-rose-500/10 text-rose-700"
                      }`}
                    >
                      Liveness: {row.liveness_passed ? "Pass" : "Fail"}
                    </span>
                  )}
                  {row.aml_passed !== null && row.aml_passed !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        row.aml_passed
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-rose-500/10 text-rose-700"
                      }`}
                    >
                      AML: {row.aml_passed ? "Clear" : "Flagged"}
                    </span>
                  )}
                </div>
              </div>
            ),
          },
          {
            header: "Status",
            priority: "primary",
            cell: (row) => {
              const category = classifyStatus(row.status, row.decision);

              if (category === "completed") {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approved</span>
                  </span>
                );
              }

              if (category === "ongoing") {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-500/15 px-2.5 py-1 rounded-full border border-blue-500/30">
                    <Activity className="h-3.5 w-3.5 animate-pulse" />
                    <span>In Progress</span>
                  </span>
                );
              }

              if (category === "declined") {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-500/15 px-2.5 py-1 rounded-full border border-rose-500/30">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Declined</span>
                  </span>
                );
              }

              if (category === "expired") {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Expired</span>
                  </span>
                );
              }

              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 animate-spin-slow" />
                  <span>Pending review</span>
                </span>
              );
            },
          },
          {
            header: "Timestamp",
            priority: "hidden-mobile",
            cell: (row) => (
              <div className="text-xs text-muted-foreground">
                <div>{formatDate(row.created_at)}</div>
                {row.verified_at && (
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Verified {formatDate(row.verified_at)}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: "Admin Controls",
            priority: "primary",
            cell: (row) => {
              const isLoading = loadingId === row.id;
              const category = classifyStatus(row.status, row.decision);

              return (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Inspect Payload & Decision */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectRow(row)}
                    className="h-8 text-xs font-semibold gap-1 rounded-lg cursor-pointer"
                    title="Inspect Didit Decision Payload"
                  >
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Inspect</span>
                  </Button>

                  {/* Override Approve */}
                  {category !== "completed" && (
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleStatusChange(row, "verified")}
                      className="h-8 text-xs font-bold bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-lg gap-1 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Approve</span>
                    </Button>
                  )}

                  {/* Override Reject */}
                  {category !== "declined" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleStatusChange(row, "rejected")}
                      className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 rounded-lg cursor-pointer"
                    >
                      <span>Reject</span>
                    </Button>
                  )}

                  {/* Reset Session */}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => handleReset(row)}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                    title="Reset KYC Session so fellow can re-verify"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>

                  {/* Delete Audit Record */}
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                    title="Delete audit record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
          },
        ]}
      />

      {/* 4. INSPECT PAYLOAD & V3 DECISION DIALOG */}
      <ResponsiveDialog
        open={Boolean(inspectRow)}
        onOpenChange={(open) => !open && setInspectRow(null)}
        title="Didit.me Verification Audit & V3 Decision"
        description="Comprehensive sovereign verification metadata, node-level feature results, and raw payload."
      >
        {inspectRow && (
          <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Session ID
                </span>
                <span className="font-mono text-xs text-foreground select-all break-all">
                  {inspectRow.session_id}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Status / Decision
                </span>
                <span className="font-semibold text-xs text-foreground">
                  {inspectRow.decision || inspectRow.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Event ID
                </span>
                <span className="font-mono text-[11px] text-muted-foreground select-all truncate block">
                  {inspectRow.event_id || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Webhook Type
                </span>
                <span className="font-mono text-xs text-foreground">
                  {inspectRow.webhook_type || "status.updated"}
                </span>
              </div>
            </div>

            {/* V3 Node Feature Checklist */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider block">
                V3 Verification Node Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* ID Document Node */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      ID Document
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-muted">
                      {inspectRow.document_type || "Government ID"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Issuing Country: {inspectRow.country_code || "Global"}
                  </p>
                </div>

                {/* Biometric Liveness Node */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Fingerprint className="h-3.5 w-3.5 text-primary" />
                      Liveness & Selfie
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        inspectRow.liveness_passed
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {inspectRow.liveness_passed ? "Passed" : "Checked"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Biometric anti-spoofing and face matching
                  </p>
                </div>

                {/* AML Screening Node */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      AML & Sanctions
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        inspectRow.aml_passed
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {inspectRow.aml_passed ? "Clear" : "Checked"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Global sanctions, PEP, and adverse media
                  </p>
                </div>

                {/* IP Risk Node */}
                <div className="p-2.5 rounded-lg border border-border/80 bg-background space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      IP & Geolocation
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted">
                      Risk: {inspectRow.ip_risk_score !== null && inspectRow.ip_risk_score !== undefined ? `${inspectRow.ip_risk_score}/100` : "Low"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Proxy, VPN detection, and jurisdiction match
                  </p>
                </div>
              </div>
            </div>

            {/* Warnings or Decline reasons */}
            {inspectRow.decline_reasons && inspectRow.decline_reasons.length > 0 && (
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200">
                <span className="text-[10px] font-bold uppercase block mb-1">
                  Decline Warnings & Reasons
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {inspectRow.decline_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Admin notes */}
            {inspectRow.admin_notes && (
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Admin Audit Notes
                </span>
                <p className="text-xs text-foreground">{inspectRow.admin_notes}</p>
              </div>
            )}

            {/* Raw JSON Payload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Raw Webhook / Session JSON
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(inspectRow.raw_payload || inspectRow, null, 2),
                      "json-copy"
                    )
                  }
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-muted font-mono text-[11px] text-foreground overflow-x-auto max-h-60 border border-border">
                {JSON.stringify(inspectRow.raw_payload || inspectRow, null, 2)}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReset(inspectRow)}
                className="rounded-lg text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                Reset Verification
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectRow(null)}
                  className="rounded-lg text-xs"
                >
                  Close
                </Button>
                {inspectRow.status !== "verified" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleStatusChange(inspectRow, "verified");
                      setInspectRow(null);
                    }}
                    className="rounded-lg text-xs font-bold bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                  >
                    Approve Verification
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
