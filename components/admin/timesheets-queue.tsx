"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { approveTimeEntry } from "@/actions/admin-work";
import { formatDate, formatCents, formatMinutes } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  Check,
  X,
  FileText,
} from "lucide-react";

export interface AdminTimeEntryRow {
  id: string;
  user_id: string;
  application_id: string;
  task_id: string;
  work_date: string;
  minutes: number;
  description: string;
  status: string;
  created_at: string;
  effectiveRate: number;
  estimatedOwed: number;
  task: {
    id: string;
    title: string;
    category: string;
  };
  profile: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

interface TimesheetsQueueProps {
  entries: AdminTimeEntryRow[];
}

export function TimesheetsQueue({ entries: initialEntries }: TimesheetsQueueProps) {
  const router = useRouter();

  const [entries, setEntries] = React.useState<AdminTimeEntryRow[]>(initialEntries);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = React.useState<Record<string, string>>({});
  const [isBulkApproving, setIsBulkApproving] = React.useState(false);

  // Group by Contributor
  const groupedByContributor = React.useMemo(() => {
    const map = new Map<string, { profile: AdminTimeEntryRow["profile"]; entries: AdminTimeEntryRow[] }>();
    for (const e of entries) {
      const key = e.user_id;
      if (!map.has(key)) {
        map.set(key, { profile: e.profile, entries: [] });
      }
      map.get(key)!.entries.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  const totalPendingMinutes = entries.reduce((acc, curr) => acc + curr.minutes, 0);
  const totalPendingOwed = entries.reduce((acc, curr) => acc + curr.estimatedOwed, 0);

  async function handleApprove(entryId: string) {
    setLoadingId(entryId);
    const res = await approveTimeEntry(entryId, true);
    setLoadingId(null);

    if (res.error) {
      toast.error("Approval failed", { description: res.error });
    } else {
      toast.success("Time entry approved.");
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      router.refresh();
    }
  }

  async function handleReject(entryId: string) {
    const note = rejectNotes[entryId];
    if (!note || !note.trim()) {
      toast.error("Please enter a note explaining why this session was not approved.");
      return;
    }

    setLoadingId(entryId);
    const res = await approveTimeEntry(entryId, false, note.trim());
    setLoadingId(null);

    if (res.error) {
      toast.error("Rejection failed", { description: res.error });
    } else {
      toast.success("Time entry rejected.");
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      router.refresh();
    }
  }

  async function handleBulkApproveContributor(contributorEntries: AdminTimeEntryRow[]) {
    if (!confirm(`Approve all ${contributorEntries.length} sessions for this contributor?`)) return;

    setIsBulkApproving(true);
    for (const e of contributorEntries) {
      await approveTimeEntry(e.id, true);
    }
    setIsBulkApproving(false);

    toast.success("All sessions approved.");
    const approvedIds = new Set(contributorEntries.map((e) => e.id));
    setEntries((prev) => prev.filter((e) => !approvedIds.has(e.id)));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Hourly Timesheets Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit submitted timesheet hours and approve earnings into contributor ledgers.
          </p>
        </div>

        {entries.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Total Pending Owed
              </span>
              <span className="font-heading font-extrabold text-base text-[#0F766E]">
                {formatCents(totalPendingOwed)} ({formatMinutes(totalPendingMinutes)})
              </span>
            </div>
          </div>
        )}
      </div>

      {groupedByContributor.length > 0 ? (
        <div className="space-y-6">
          {groupedByContributor.map(([userId, { profile, entries: userEntries }]) => {
            const userMins = userEntries.reduce((acc, curr) => acc + curr.minutes, 0);
            const userOwed = userEntries.reduce((acc, curr) => acc + curr.estimatedOwed, 0);

            return (
              <div
                key={userId}
                className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden space-y-3"
              >
                {/* Contributor Header Bar */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                      {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm text-foreground">
                        {profile.full_name || profile.email}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right text-xs">
                      <span className="font-bold text-foreground block">
                        {formatMinutes(userMins)} logged
                      </span>
                      <span className="font-mono text-[#0F766E] font-extrabold text-xs">
                        {formatCents(userOwed)} owed
                      </span>
                    </div>

                    <Button
                      size="sm"
                      disabled={isBulkApproving}
                      onClick={() => handleBulkApproveContributor(userEntries)}
                      className="rounded-full text-xs font-bold gap-1.5 h-8 px-4 bg-[#0F766E] text-white hover:bg-[#0D655E]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve All ({userEntries.length})</span>
                    </Button>
                  </div>
                </div>

                {/* Entries Table */}
                <div className="p-3">
                  <ResponsiveTable
                    data={userEntries}
                    keyExtractor={(e) => e.id}
                    emptyMessage="No time entries."
                    columns={[
                      {
                        header: "Date",
                        priority: "secondary",
                        cell: (e) => (
                          <span className="font-medium text-foreground whitespace-nowrap">
                            {formatDate(e.work_date)}
                          </span>
                        ),
                      },
                      {
                        header: "Task",
                        priority: "primary",
                        cell: (e) => (
                          <span className="font-semibold text-foreground">{e.task.title}</span>
                        ),
                      },
                      {
                        header: "Duration",
                        priority: "primary",
                        cell: (e) => (
                          <span className="font-bold text-foreground">{formatMinutes(e.minutes)}</span>
                        ),
                      },
                      {
                        header: "Rate",
                        priority: "secondary",
                        cell: (e) => (
                          <span className="font-mono text-muted-foreground">
                            {formatCents(e.effectiveRate)}/hr
                          </span>
                        ),
                      },
                      {
                        header: "Description",
                        priority: "secondary",
                        cell: (e) => (
                          <div className="max-w-xs space-y-1 text-foreground/90">
                            <p className="break-words">{e.description}</p>
                            <Input
                              placeholder="Reject note (if rejecting)..."
                              value={rejectNotes[e.id] || ""}
                              onChange={(evt) =>
                                setRejectNotes({ ...rejectNotes, [e.id]: evt.target.value })
                              }
                              className="h-9 min-h-[36px] text-xs mt-1 bg-background"
                            />
                          </div>
                        ),
                      },
                      {
                        header: "Est. Owed",
                        priority: "primary",
                        cell: (e) => (
                          <span className="font-mono font-bold text-[#0F766E]">
                            {formatCents(e.estimatedOwed)}
                          </span>
                        ),
                      },
                      {
                        header: "Decision",
                        priority: "primary",
                        align: "right",
                        cell: (e) => {
                          const isLoading = loadingId === e.id;
                          return (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleApprove(e.id)}
                                className="h-8 touch-target text-xs font-semibold rounded-full bg-[#0F766E] text-white hover:bg-[#0D655E] gap-1 px-3"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                <span>Approve</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleReject(e.id)}
                                className="h-8 touch-target text-xs font-semibold rounded-full text-destructive hover:bg-destructive/10 gap-1 px-2.5"
                              >
                                <X className="h-3 w-3" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          );
                        },
                      },
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center bg-card rounded-[14px] border border-dashed border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-foreground">
            All Timesheets Reviewed!
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There are no pending hourly timesheet entries awaiting review right now.
          </p>
        </div>
      )}
    </div>
  );
}
