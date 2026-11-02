"use client";

import * as React from "react";
import Link from "next/link";
import { Application, Task, ApplicationEvent } from "@/types";
import { formatDate, formatPay } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { StatusTimeline } from "@/components/app/status-timeline";
import { getApplicationDetail } from "@/lib/applications";
import { withdrawApplication, reapplyToTask } from "@/actions/applications";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  X,
  ExternalLink,
  Hourglass,
  Clock,
  RotateCcw,
  Undo2,
  FileText,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface ApplicationDrawerProps {
  applicationId: string | null;
  onClose: () => void;
  initialApp?: (Application & { task?: Task | null; tasks?: Task | null; rank?: number; total?: number }) | null;
}

export function ApplicationDrawer({
  applicationId,
  onClose,
  initialApp,
}: ApplicationDrawerProps) {
  const [loading, setLoading] = React.useState(!initialApp);
  const [appData, setAppData] = React.useState<any>(initialApp || null);
  const [events, setEvents] = React.useState<ApplicationEvent[]>([]);
  const [rank, setRank] = React.useState<{ rank: number; total: number } | null>(
    initialApp?.rank && initialApp?.total
      ? { rank: initialApp.rank, total: initialApp.total }
      : null
  );
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    if (applicationId) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [applicationId, onClose]);

  React.useEffect(() => {
    if (!applicationId) return;

    let mounted = true;
    setLoading(true);

    getApplicationDetail(applicationId)
      .then((res) => {
        if (!mounted) return;
        if (res.app) {
          setAppData(res.app);
          setEvents(res.events as ApplicationEvent[]);
          if (res.rank) {
            setRank({
              rank: Number(res.rank.rank),
              total: Number(res.rank.total),
            });
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to load application detail:", err);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applicationId]);

  if (!applicationId) return null;

  const task = appData?.task || appData?.tasks;
  const isWaitlisted = appData?.status === "waitlisted";
  const isWithdrawn = appData?.status === "withdrawn";
  const isApproved = appData?.status === "approved";

  const handleWithdraw = async () => {
    if (
      !confirm(
        `Are you sure you want to withdraw your application for "${task?.title || "this task"}"?`
      )
    ) {
      return;
    }

    setActionLoading(true);
    const res = await withdrawApplication(appData.id);
    setActionLoading(false);

    if (res.error) {
      toast.error(typeof res.error === "string" ? res.error : "Failed to withdraw.");
    } else {
      toast.success("Application withdrawn.");
      setAppData((prev: any) => ({ ...prev, status: "withdrawn", position: null }));
      setRank(null);
    }
  };

  const handleReapply = async () => {
    setActionLoading(true);
    const res = await reapplyToTask(appData.id);
    setActionLoading(false);

    if (res.error) {
      toast.error(typeof res.error === "string" ? res.error : "Failed to re-apply.");
    } else {
      toast.success("Rejoined waitlist!");
      setAppData((prev: any) => ({ ...prev, status: "waitlisted" }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Right Drawer Sheet */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen sm:max-w-md h-[100dvh] bg-card sm:border-l border-border shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border/80 bg-muted/10 space-y-2 shrink-0 pt-safe">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {task?.category || "Specialized Task"}
                </span>
                {appData && <StatusBadge status={appData.status} />}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer touch-target"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h3 className="font-heading text-lg font-bold text-foreground leading-snug">
                {task?.title || "Task Evaluation"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applied on {formatDate(appData?.created_at)}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading application dossier...</span>
              </div>
            ) : (
              <>
                {/* Live Waitlist Rank Banner while waitlisted */}
                {isWaitlisted && rank && (
                  <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#78350F] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Hourglass className="h-3.5 w-3.5 text-[#B45309]" />
                        Waitlist Queue Position
                      </span>
                      <span className="font-heading font-extrabold text-sm">
                        #{rank.rank} of {rank.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#FDE68A] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#B45309] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            8,
                            Math.min(100, (1 - (rank.rank - 1) / (rank.total || 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-[#78350F] leading-relaxed">
                      Review teams evaluate cohorts on a rolling basis. Your rank advances as spots clear.
                    </p>
                  </div>
                )}

                {/* Approved Clearance Notice */}
                {isApproved && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Cohort Admission Approved</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You have passed candidate verification for this task and are admitted to the active batch.
                    </p>
                  </div>
                )}

                {/* Task Details Bento */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/20 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Pay Range
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block font-mono">
                      {formatPay(task?.pay_min, task?.pay_max, task?.pay_unit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Commitment
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block">
                      {task?.commitment || "Flexible"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Location
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block">
                      {task?.location || "Remote"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Task Link
                    </span>
                    {task?.slug && (
                      <Link
                        href={`/tasks/${task.slug}`}
                        className="font-bold text-primary hover:underline mt-0.5 inline-flex items-center gap-1"
                      >
                        <span>Full Description</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Contributor Submitted Note */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Submitted Cover Brief
                  </h4>
                  <div className="p-3.5 rounded-xl border border-border bg-card text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {appData?.note || "No specific brief note submitted."}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="space-y-2 pt-2 border-t border-border/70">
                  <h4 className="text-xs font-bold text-foreground">
                    Application History Timeline
                  </h4>
                  <StatusTimeline
                    events={events}
                    appliedDate={appData?.created_at}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border bg-card shrink-0 pb-safe">
            <div className="flex items-center justify-between gap-3">
              {isWaitlisted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWithdraw}
                  disabled={actionLoading}
                  className="text-xs text-destructive hover:bg-destructive/10 flex-1 h-11 min-h-[44px] touch-target rounded-full gap-1.5 cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                  <span>Withdraw Application</span>
                </Button>
              )}

              {isWithdrawn && (
                <Button
                  size="sm"
                  onClick={handleReapply}
                  disabled={actionLoading}
                  className="text-xs font-bold flex-1 h-11 min-h-[44px] touch-target rounded-full gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  <span>Re-apply to Task</span>
                </Button>
              )}

              {task?.slug && (
                <Link href={`/tasks/${task.slug}`} className="flex-1">
                  <Button
                    variant={isApproved ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs font-bold h-11 min-h-[44px] touch-target rounded-full gap-1.5"
                  >
                    <span>View Task Page</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
