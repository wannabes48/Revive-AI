"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@/lib/supabase/types";
import {
  setApplicationStatus,
  bulkSetApplicationStatus,
  moveApplication,
} from "@/actions/applications";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Search,
  MessageSquare,
  User,
  MapPin,
  Briefcase,
  AlertCircle,
  Loader2,
  Filter,
  Check,
  X,
  Trash2,
  ShieldCheck,
} from "lucide-react";

export interface WaitlistApplicant {
  id: string;
  task_id: string;
  user_id: string;
  status: ApplicationStatus;
  note: string | null;
  position: number | null;
  admin_note: string | null;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    expertise: string | null;
    country: string | null;
    bio: string | null;
  } | null;
}

interface WaitlistTableProps {
  taskId: string;
  taskSlots: number | null;
  applications: WaitlistApplicant[];
}

export function WaitlistTable({ taskId, taskSlots, applications }: WaitlistTableProps) {
  const router = useRouter();

  // Search & Filter
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Action Loading
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Single Reject Dialog
  const [rejectDialogApp, setRejectDialogApp] = React.useState<WaitlistApplicant | null>(null);
  const [rejectNote, setRejectNote] = React.useState("");

  // Bulk Reject Dialog
  const [bulkRejectOpen, setBulkRejectOpen] = React.useState(false);
  const [bulkRejectNote, setBulkRejectNote] = React.useState("");

  // View Candidate Note Dialog
  const [viewNoteApp, setViewNoteApp] = React.useState<WaitlistApplicant | null>(null);

  // Filter applications
  const filteredApps = React.useMemo(() => {
    return applications.filter((app) => {
      const profile = app.profiles;
      const matchesStatus =
        selectedStatus === "all" ? true : app.status === selectedStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        profile?.full_name?.toLowerCase().includes(q) ||
        profile?.email?.toLowerCase().includes(q) ||
        profile?.expertise?.toLowerCase().includes(q) ||
        profile?.country?.toLowerCase().includes(q) ||
        app.note?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [applications, selectedStatus, searchQuery]);

  // Waitlisted subset for ordering checks
  const waitlistedApps = React.useMemo(() => {
    return applications
      .filter((a) => a.status === "waitlisted" && a.position != null)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [applications]);

  // Bulk Selection Handlers
  const allFilteredSelected =
    filteredApps.length > 0 &&
    filteredApps.every((a) => selectedIds.includes(a.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map((a) => a.id));
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Row Action: Move Position
  async function handleMove(id: string, direction: "up" | "down") {
    setLoadingId(id);
    setFeedbackMessage(null);
    const res = await moveApplication(id, direction);
    if (res.error) {
      setFeedbackMessage({ type: "error", text: res.error });
      toast.error(res.error);
    } else if (res.message) {
      setFeedbackMessage({ type: "success", text: res.message });
      toast.success(res.message);
      router.refresh();
    }
    setLoadingId(null);
  }

  // Row Action: Approve
  async function handleApprove(id: string) {
    setLoadingId(id);
    setFeedbackMessage(null);
    const res = await setApplicationStatus(id, "approved");
    if (res.error) {
      setFeedbackMessage({ type: "error", text: res.error });
      toast.error(res.error);
    } else {
      setFeedbackMessage({ type: "success", text: "Applicant approved and notified." });
      toast.success("Applicant approved and notified.");
      router.refresh();
    }
    setLoadingId(null);
  }

  // Confirm Single Reject
  async function confirmReject() {
    if (!rejectDialogApp) return;
    setLoadingId(rejectDialogApp.id);
    setFeedbackMessage(null);
    const res = await setApplicationStatus(rejectDialogApp.id, "rejected", rejectNote);
    if (res.error) {
      setFeedbackMessage({ type: "error", text: res.error });
      toast.error(res.error);
    } else {
      setFeedbackMessage({ type: "success", text: "Applicant marked as not selected." });
      toast.info("Applicant marked as not selected.");
      setRejectDialogApp(null);
      setRejectNote("");
      router.refresh();
    }
    setLoadingId(null);
  }

  // Bulk Action: Approve Selected
  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    setFeedbackMessage(null);
    const res = await bulkSetApplicationStatus(selectedIds, "approved");
    if (res.error) {
      setFeedbackMessage({ type: "error", text: res.error });
      toast.error(res.error);
    } else {
      setFeedbackMessage({
        type: "success",
        text: `Approved and notified ${selectedIds.length} candidate(s).`,
      });
      toast.success(`Approved ${selectedIds.length} candidate(s).`);
      setSelectedIds([]);
      router.refresh();
    }
    setBulkLoading(false);
  }

  // Bulk Action: Reject Selected
  async function confirmBulkReject() {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    setFeedbackMessage(null);
    const res = await bulkSetApplicationStatus(selectedIds, "rejected", bulkRejectNote);
    if (res.error) {
      setFeedbackMessage({ type: "error", text: res.error });
      toast.error(res.error);
    } else {
      setFeedbackMessage({
        type: "success",
        text: `Rejected ${selectedIds.length} candidate(s).`,
      });
      toast.info(`Updated ${selectedIds.length} candidate(s) to not selected.`);
      setSelectedIds([]);
      setBulkRejectOpen(false);
      setBulkRejectNote("");
      router.refresh();
    }
    setBulkLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium border ${
            feedbackMessage.type === "success"
              ? "bg-[#CCFBF1]/50 border-[#99F6E4] text-[#0F766E]"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-[14px] border border-border shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Candidates" },
            { id: "waitlisted", label: "Waitlisted" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "withdrawn", label: "Withdrawn" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search candidate, skill, country"
            placeholder="Search candidate, skill, country..."
            className="pl-9 h-8 text-xs rounded-full border-border bg-background"
          />
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/25 rounded-xl px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span>{selectedIds.length} candidate(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={bulkLoading}
              onClick={handleBulkApprove}
              className="rounded-full text-xs font-semibold h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
            >
              {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span>Approve Selected</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={bulkLoading}
              onClick={() => setBulkRejectOpen(true)}
              className="rounded-full text-xs font-semibold h-7 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
            >
              <X className="h-3 w-3" />
              <span>Reject Selected</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="rounded-full text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Waitlist Data: Table on sm+, Cards on mobile */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        {filteredApps.length > 0 ? (
          <>
            {/* Mobile Card View (< sm) */}
            <div className="block sm:hidden divide-y divide-border/60">
              {filteredApps.map((app) => {
                const profile = app.profiles;
                const candidateName =
                  profile?.full_name || profile?.email?.split("@")[0] || "Candidate";
                const isSelected = selectedIds.includes(app.id);
                const isActionLoading = loadingId === app.id;

                const waitlistIndex = waitlistedApps.findIndex((a) => a.id === app.id);
                const canMoveUp = app.status === "waitlisted" && waitlistIndex > 0;
                const canMoveDown =
                  app.status === "waitlisted" &&
                  waitlistIndex >= 0 &&
                  waitlistIndex < waitlistedApps.length - 1;

                return (
                  <div
                    key={`mobile-${app.id}`}
                    className={`p-4 space-y-3 transition-colors ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Header: Select + Position + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(app.id)}
                          aria-label={`Select ${candidateName}`}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        {app.status === "waitlisted" && app.position != null ? (
                          <div className="flex items-center gap-1 bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                            <span className="font-heading font-black text-xs text-[#78350F]">
                              #{app.position}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={!canMoveUp || isActionLoading}
                                onClick={() => handleMove(app.id, "up")}
                                title="Move up in queue"
                                aria-label="Move up in waitlist queue"
                                className="text-[#78350F] hover:text-black disabled:opacity-30 p-0.5"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={!canMoveDown || isActionLoading}
                                onClick={() => handleMove(app.id, "down")}
                                title="Move down in queue"
                                aria-label="Move down in waitlist queue"
                                className="text-[#78350F] hover:text-black disabled:opacity-30 p-0.5"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No queue pos</span>
                        )}
                      </div>

                      <StatusBadge status={app.status} />
                    </div>

                    {/* Candidate Details */}
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground">
                        {candidateName}
                      </h4>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        {profile?.expertise && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            <Briefcase className="h-3 w-3 text-primary" />
                            {profile.expertise}
                          </span>
                        )}
                        {profile?.country && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {profile.country}
                          </span>
                        )}
                        <span>&bull; Applied {formatDate(app.created_at)}</span>
                      </div>
                    </div>

                    {/* Candidate Brief Preview */}
                    {app.note && (
                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/60 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                          Brief Statement
                        </span>
                        <p className="text-foreground italic line-clamp-2">
                          &ldquo;{app.note}&rdquo;
                        </p>
                      </div>
                    )}

                    {app.admin_note && (
                      <div className="bg-destructive/5 p-2 rounded-lg border border-destructive/20 text-xs text-destructive">
                        <strong>Reviewer Note:</strong> {app.admin_note}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-border/50 gap-2">
                      {app.note ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewNoteApp(app)}
                          className="min-h-[44px] rounded-full text-xs text-primary px-3 gap-1"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>View Full Brief</span>
                        </Button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-2">
                        {isActionLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            {app.status !== "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(app.id)}
                                className="min-h-[44px] rounded-full text-xs font-semibold px-3.5 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#CCFBF1]/50 gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </Button>
                            )}

                            {app.status !== "rejected" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRejectDialogApp(app);
                                  setRejectNote(app.admin_note || "");
                                }}
                                className="min-h-[44px] rounded-full text-xs font-semibold px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all candidates"
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Queue Pos</th>
                  <th className="py-3 px-4">Candidate Profile</th>
                  <th className="py-3 px-4 whitespace-nowrap">Applied Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Candidate Brief</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-5 text-right whitespace-nowrap">Waitlist Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredApps.map((app) => {
                  const profile = app.profiles;
                  const candidateName =
                    profile?.full_name || profile?.email?.split("@")[0] || "Candidate";
                  const isSelected = selectedIds.includes(app.id);
                  const isActionLoading = loadingId === app.id;

                  // Find boundary for waitlisted items
                  const waitlistIndex = waitlistedApps.findIndex((a) => a.id === app.id);
                  const canMoveUp = app.status === "waitlisted" && waitlistIndex > 0;
                  const canMoveDown =
                    app.status === "waitlisted" &&
                    waitlistIndex >= 0 &&
                    waitlistIndex < waitlistedApps.length - 1;

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-muted/20 transition-colors duration-150 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(app.id)}
                          aria-label={`Select ${candidateName}`}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Position & Reorder Controls */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {app.status === "waitlisted" && app.position != null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-heading font-extrabold text-sm text-[#78350F] w-7">
                              #{app.position}
                            </span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={!canMoveUp || isActionLoading}
                                onClick={() => handleMove(app.id, "up")}
                                title="Move up in queue"
                                aria-label="Move up in waitlist queue"
                                className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:pointer-events-none p-0.5 rounded transition-colors"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={!canMoveDown || isActionLoading}
                                onClick={() => handleMove(app.id, "down")}
                                title="Move down in queue"
                                aria-label="Move down in waitlist queue"
                                className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:pointer-events-none p-0.5 rounded transition-colors"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Profile Info */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-foreground leading-tight">
                          {candidateName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {profile?.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          {profile?.expertise && (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                              <Briefcase className="h-3 w-3 text-primary" />
                              {profile.expertise}
                            </span>
                          )}
                          {profile?.country && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {profile.country}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(app.created_at)}
                      </td>

                      {/* Cover Note & Admin Note */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {app.note ? (
                          <button
                            type="button"
                            onClick={() => setViewNoteApp(app)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium text-left line-clamp-1"
                          >
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            <span className="truncate">{app.note}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None provided</span>
                        )}
                        {app.admin_note && (
                          <p className="text-[10px] text-destructive font-medium line-clamp-1 mt-0.5">
                            Note: {app.admin_note}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              {/* Approve Button */}
                              {app.status !== "approved" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(app.id)}
                                  title="Approve candidate"
                                  className="rounded-full text-xs font-semibold h-7 px-2.5 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#CCFBF1]/50 gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Approve</span>
                                </Button>
                              )}

                              {/* Reject Button */}
                              {app.status !== "rejected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRejectDialogApp(app);
                                    setRejectNote(app.admin_note || "");
                                  }}
                                  title="Reject candidate"
                                  className="rounded-full text-xs font-semibold h-7 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Reject</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        ) : (
          <div className="p-12 text-center space-y-2">
            <User className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-heading font-bold text-foreground">
              No applicants found
            </h4>
            <p className="text-xs text-muted-foreground">
              {applications.length === 0
                ? "No specialists have applied to this task yet."
                : "No applicants matched the selected status or query."}
            </p>
          </div>
        )}
      </div>

      {/* Reject Dialog (Single) */}
      <ResponsiveDialog
        open={Boolean(rejectDialogApp)}
        onOpenChange={(open) => !open && setRejectDialogApp(null)}
        title="Reject Applicant"
        description={`Mark ${rejectDialogApp?.profiles?.full_name || rejectDialogApp?.profiles?.email} as rejected. An automated notification email will be dispatched to update their application status.`}
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogApp(null)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmReject}
              className="rounded-full text-xs font-semibold gap-1.5 h-10 touch-target"
            >
              <X className="h-3.5 w-3.5" />
              <span>Confirm Rejection</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-2 py-2">
          <label className="text-xs font-semibold text-foreground">
            Internal Admin Note / Rejection Reason (Optional)
          </label>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Needs deeper specialized oncology clinical research experience..."
            className="text-base sm:text-xs min-h-[90px] rounded-lg border-border"
          />
        </div>
      </ResponsiveDialog>

      {/* Bulk Reject Dialog */}
      <ResponsiveDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selectedIds.length} Candidate(s)?`}
        description={`All ${selectedIds.length} selected candidates will have their statuses updated to rejected, and each will receive a notification email.`}
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkRejectOpen(false)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkLoading}
              onClick={confirmBulkReject}
              className="rounded-full text-xs font-semibold gap-1.5 h-10 touch-target"
            >
              {bulkLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              <span>Confirm Bulk Rejection</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-2 py-2">
          <label className="text-xs font-semibold text-foreground">
            Optional Admin Note
          </label>
          <Textarea
            value={bulkRejectNote}
            onChange={(e) => setBulkRejectNote(e.target.value)}
            placeholder="Reason for bulk rejection..."
            className="text-base sm:text-xs min-h-[80px] rounded-lg border-border"
          />
        </div>
      </ResponsiveDialog>

      {/* View Applicant Brief Dialog */}
      <ResponsiveDialog
        open={Boolean(viewNoteApp)}
        onOpenChange={(open) => !open && setViewNoteApp(null)}
        title={viewNoteApp?.profiles?.full_name || viewNoteApp?.profiles?.email || "Applicant Brief"}
        description={`${viewNoteApp?.profiles?.expertise || "Candidate"} • ${viewNoteApp?.profiles?.country || "Location not stated"}`}
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewNoteApp(null)}
            className="rounded-full text-xs h-10 touch-target w-full sm:w-auto"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-4 py-2">
          {viewNoteApp?.profiles?.bio && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Candidate Bio
              </span>
              <p className="text-xs text-foreground mt-1 whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border">
                {viewNoteApp.profiles.bio}
              </p>
            </div>
          )}

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Application Statement / Cover Brief
            </span>
            <p className="text-xs text-foreground mt-1 whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border">
              {viewNoteApp?.note || "No cover brief submitted."}
            </p>
          </div>

          {viewNoteApp?.admin_note && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                Admin Internal Note
              </span>
              <p className="text-xs text-foreground mt-1 whitespace-pre-wrap bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                {viewNoteApp.admin_note}
              </p>
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
