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
import { adminOverrideKycStatus, adminDeleteKycVerification } from "@/actions/admin-kyc";
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
} from "lucide-react";

export interface KycVerificationRow {
  id: string;
  user_id: string;
  session_id: string;
  workflow_id?: string | null;
  status: string;
  decision?: string | null;
  document_type?: string | null;
  country_code?: string | null;
  vendor_data?: string | null;
  verified_at?: string | null;
  decline_reasons?: string[] | null;
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
      toast.success("Session ID copied to clipboard.");
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const handleStatusChange = async (
    row: KycVerificationRow,
    newStatus: "verified" | "pending" | "rejected"
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

  // Filtered dataset
  const filtered = React.useMemo(() => {
    return verifications.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const name = row.profile?.full_name?.toLowerCase() || "";
      const email = row.profile?.email?.toLowerCase() || "";
      const session = row.session_id?.toLowerCase() || "";
      const doc = row.document_type?.toLowerCase() || "";
      const country = row.country_code?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        session.includes(q) ||
        doc.includes(q) ||
        country.includes(q);

      const normalizedStatus = row.status?.toLowerCase() || "pending";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "verified" &&
          (normalizedStatus === "verified" || row.decision?.toLowerCase() === "approved")) ||
        (statusFilter === "pending" &&
          (normalizedStatus === "pending" || normalizedStatus === "in_review")) ||
        (statusFilter === "rejected" &&
          (normalizedStatus === "rejected" ||
            normalizedStatus === "expired" ||
            row.decision?.toLowerCase() === "declined"));

      return matchesSearch && matchesStatus;
    });
  }, [verifications, searchQuery, statusFilter]);

  // Aggregate Metrics
  const totalCount = verifications.length;
  const verifiedCount = verifications.filter(
    (v) => v.status === "verified" || v.decision?.toLowerCase() === "approved"
  ).length;
  const pendingCount = verifications.filter(
    (v) => v.status === "pending" || v.status === "in_review"
  ).length;
  const rejectedCount = verifications.filter(
    (v) =>
      v.status === "rejected" ||
      v.status === "expired" ||
      v.decision?.toLowerCase() === "declined"
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Submissions
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-foreground">
            {totalCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">
            Didit.me + manual KYC logs
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            Verified Fellows
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-700 dark:text-emerald-400">
            {verifiedCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">Unlocked for work</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            Pending Review
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-amber-700 dark:text-amber-400">
            {pendingCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">
            Awaiting webhook / manual sign-off
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Rejected / Expired
          </span>
          <span className="text-2xl sm:text-3xl font-heading font-black text-rose-700 dark:text-rose-400">
            {rejectedCount}
          </span>
          <span className="text-[11px] text-muted-foreground block">Action or retry required</span>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
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

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All (${totalCount})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "verified", label: `Verified (${verifiedCount})` },
            { id: "rejected", label: `Rejected (${rejectedCount})` },
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
              No verification records found
            </h4>
            <p className="text-xs text-muted-foreground">
              No KYC verification sessions match the current filter.
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
            header: "Session & Provider",
            priority: "secondary",
            cell: (row) => (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                    Didit.me
                  </span>
                  {row.workflow_id && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                      wf: {row.workflow_id}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[140px]">{row.session_id}</span>
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
            header: "Document & Country",
            priority: "secondary",
            cell: (row) => (
              <div className="space-y-0.5 text-xs">
                <div className="font-medium text-foreground capitalize flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{row.document_type?.replace(/_/g, " ") || "Passport / ID"}</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>{row.country_code || "Global"}</span>
                </div>
              </div>
            ),
          },
          {
            header: "Status",
            priority: "primary",
            cell: (row) => {
              const st = row.status?.toLowerCase() || "pending";
              const isVerified = st === "verified" || row.decision?.toLowerCase() === "approved";
              const isRejected =
                st === "rejected" ||
                st === "expired" ||
                row.decision?.toLowerCase() === "declined";

              if (isVerified) {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </span>
                );
              }

              if (isRejected) {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-500/15 px-2.5 py-1 rounded-full border border-rose-500/30">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Rejected</span>
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
            header: "Submitted",
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
            header: "Review Actions",
            priority: "primary",
            cell: (row) => {
              const isLoading = loadingId === row.id;
              const isVerified = row.status === "verified";

              return (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Inspect Payload Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectRow(row)}
                    className="h-8 text-xs font-semibold gap-1 rounded-lg cursor-pointer"
                    title="Inspect Didit Webhook Payload"
                  >
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Inspect</span>
                  </Button>

                  {/* Override Approve */}
                  {!isVerified && (
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
                  {row.status !== "rejected" && (
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

                  {/* Delete Audit Record */}
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
          },
        ]}
      />

      {/* 4. INSPECT PAYLOAD DIALOG */}
      <ResponsiveDialog
        open={Boolean(inspectRow)}
        onOpenChange={(open) => !open && setInspectRow(null)}
        title="Didit.me Verification Audit Payload"
        description="Raw verification payload, metadata, and sovereign decision details."
      >
        {inspectRow && (
          <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border">
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
                  Decision / Status
                </span>
                <span className="font-semibold text-xs text-foreground">
                  {inspectRow.decision || inspectRow.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Fellow ID
                </span>
                <span className="font-mono text-[11px] text-muted-foreground select-all truncate block">
                  {inspectRow.user_id}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Workflow ID
                </span>
                <span className="font-mono text-xs text-foreground">
                  {inspectRow.workflow_id || "default"}
                </span>
              </div>
            </div>

            {/* Admin notes */}
            {inspectRow.admin_notes && (
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Admin Audit Notes
                </span>
                <p className="text-xs text-foreground">{inspectRow.admin_notes}</p>
              </div>
            )}

            {/* Decline reasons */}
            {inspectRow.decline_reasons && inspectRow.decline_reasons.length > 0 && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200">
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

            {/* Raw JSON Payload */}
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1.5">
                Raw Webhook / Session JSON
              </span>
              <pre className="p-3 rounded-xl bg-muted font-mono text-[11px] text-foreground overflow-x-auto max-h-72 border border-border">
                {JSON.stringify(
                  inspectRow.raw_payload || {
                    session_id: inspectRow.session_id,
                    user_id: inspectRow.user_id,
                    status: inspectRow.status,
                    decision: inspectRow.decision,
                    document_type: inspectRow.document_type,
                    country_code: inspectRow.country_code,
                    verified_at: inspectRow.verified_at,
                    created_at: inspectRow.created_at,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
        )}
      </ResponsiveDialog>
    </div>
  );
}
