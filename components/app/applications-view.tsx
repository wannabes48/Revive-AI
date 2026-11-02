"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Application, Task, ApplicationEvent } from "@/lib/supabase/types";
import { formatDate, formatPay } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { withdrawApplication, reapplyApplication, getApplicationTimeline } from "@/actions/applications";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Layers,
  Search,
  Filter,
  X,
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
  Hourglass,
  Calendar,
  DollarSign,
  MapPin,
  MessageSquare,
  History,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";

import { ApplicationDrawer } from "@/components/app/application-drawer";

export interface JoinedAppWithRank extends Application {
  tasks: Task | null;
  rank?: number;
  total?: number;
}

interface ApplicationsViewProps {
  initialApplications: JoinedAppWithRank[];
  initialStatus?: string;
  initialOpenId?: string;
}

type FilterStatus = "all" | "waitlisted" | "approved" | "rejected" | "withdrawn";

export function ApplicationsView({
  initialApplications,
  initialStatus = "all",
  initialOpenId,
}: ApplicationsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter tab state
  const activeStatus = (searchParams.get("status") as FilterStatus) || (initialStatus as FilterStatus) || "all";
  
  // Drawer open state
  const [openId, setOpenId] = React.useState<string | null>(
    searchParams.get("open") || initialOpenId || null
  );

  // Search filter (?q=)
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("q") || "");

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set("q", val.trim());
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Loading states
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Applications local state for optimistic updates
  const [apps, setApps] = React.useState<JoinedAppWithRank[]>(initialApplications);

  // Sync openId from URL if changed
  React.useEffect(() => {
    const urlOpen = searchParams.get("open");
    if (urlOpen !== openId) {
      setOpenId(urlOpen);
    }
  }, [searchParams]);

  // URL sync helpers
  const handleStatusFilter = (status: FilterStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleOpenDrawer = (id: string) => {
    setOpenId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("open", id);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setOpenId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("open");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Withdraw action
  const handleWithdraw = async (app: JoinedAppWithRank) => {
    if (!confirm(`Are you sure you want to withdraw from "${app.tasks?.title || "this task"}"?`)) {
      return;
    }

    setActionLoadingId(app.id);
    const res = await withdrawApplication(app.id, app.tasks?.slug);
    setActionLoadingId(null);

    if (res.error) {
      toast.error("Failed to withdraw", { description: res.error });
    } else {
      toast.success("Application Withdrawn", {
        description: "Your waitlist position has been released.",
      });
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, status: "withdrawn", position: null, rank: undefined } : a
        )
      );
      router.refresh();
    }
  };

  // Re-apply action
  const handleReapply = async (app: JoinedAppWithRank) => {
    setActionLoadingId(app.id);
    const res = await reapplyApplication(app.id, app.tasks?.slug);
    setActionLoadingId(null);

    if (res.error) {
      toast.error("Failed to re-apply", { description: res.error });
    } else {
      toast.success("Rejoined Waitlist", {
        description: "You have re-entered the evaluation queue.",
      });
      router.refresh();
    }
  };

  // Counts
  const totalCount = apps.length;
  const waitlistedCount = apps.filter((a) => a.status === "waitlisted").length;
  const approvedCount = apps.filter((a) => a.status === "approved").length;
  const rejectedCount = apps.filter((a) => a.status === "rejected").length;
  const withdrawnCount = apps.filter((a) => a.status === "withdrawn").length;

  // Filtered applications
  const filteredApps = apps.filter((item) => {
    if (activeStatus !== "all" && item.status !== activeStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = item.tasks?.title?.toLowerCase() || "";
      const cat = item.tasks?.category?.toLowerCase() || "";
      if (!title.includes(q) && !cat.includes(q)) return false;
    }
    return true;
  });

  // Sort: newest first; "Approved" and "Waitlisted" items rise above the rest on the All tab
  const sortedFilteredApps = [...filteredApps].sort((a, b) => {
    if (activeStatus === "all") {
      const priority = (s: string) => {
        if (s === "approved") return 1;
        if (s === "waitlisted") return 2;
        return 3;
      };
      const prioDiff = priority(a.status) - priority(b.status);
      if (prioDiff !== 0) return prioDiff;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const selectedApp = apps.find((a) => a.id === openId);

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <Briefcase className="h-3.5 w-3.5" />
            Contributor Workspace
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Applications & Waitlists
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-xl">
            Track your qualification queues, waitlist review standing, and task allocation benchmarks in real time.
          </p>
        </div>

        {/* Quick Summary Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-card p-1.5 rounded-[14px] border border-border shadow-2xs">
          <div className="px-3 py-1.5 bg-muted/30 rounded-lg border border-border/40 text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider">
              Total
            </span>
            <span className="font-heading text-base font-extrabold text-foreground">
              {totalCount}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-[#FEF3C7]/40 rounded-lg border border-[#FDE68A]/60 text-center">
            <span className="text-[10px] font-bold text-[#78350F] uppercase block tracking-wider">
              Waitlisted
            </span>
            <span className="font-heading text-base font-extrabold text-[#78350F]">
              {waitlistedCount}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-[#CCFBF1]/40 rounded-lg border border-[#99F6E4]/60 text-center">
            <span className="text-[10px] font-bold text-[#0F766E] uppercase block tracking-wider">
              Approved
            </span>
            <span className="font-heading text-base font-extrabold text-[#0F766E]">
              {approvedCount}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-muted/30 rounded-lg border border-border/40 text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider">
              Withdrawn
            </span>
            <span className="font-heading text-base font-extrabold text-muted-foreground">
              {withdrawnCount}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { key: "all", label: "All", count: totalCount },
            { key: "waitlisted", label: "Waitlisted", count: waitlistedCount },
            { key: "approved", label: "Approved", count: approvedCount },
            { key: "rejected", label: "Not Selected", count: rejectedCount },
            { key: "withdrawn", label: "Withdrawn", count: withdrawnCount },
          ].map((tab) => {
            const isActive = activeStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusFilter(tab.key as FilterStatus)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by title or field..."
            className="pl-8.5 h-8.5 text-xs rounded-full bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Applications List */}
      {sortedFilteredApps.length > 0 ? (
        <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
          <div className="divide-y divide-border/60">
            {sortedFilteredApps.map((item) => {
              const task = item.tasks;
              const isWaitlisted = item.status === "waitlisted";
              const isApproved = item.status === "approved";
              const isWithdrawn = item.status === "withdrawn";
              const isLoading = actionLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isApproved
                      ? "bg-primary/5 hover:bg-primary/8 border-l-4 border-l-primary"
                      : "hover:bg-muted/20"
                  }`}
                >
                  {/* Left Column: Task Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {task?.category || "General"}
                      </span>
                      <StatusBadge status={item.status} pulsing={isWaitlisted} />
                      {task?.location && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.location}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(item.id)}
                        className="font-heading text-base font-bold text-foreground hover:text-primary transition-colors text-left truncate cursor-pointer"
                      >
                        {task?.title || "Evaluation Task"}
                      </button>
                    </div>

                    {/* Metadata & Live Rank */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                      <span className="font-mono text-primary font-semibold">
                        {formatPay(task?.pay_min, task?.pay_max, task?.pay_unit)}
                      </span>
                      {task?.commitment && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.commitment}
                        </span>
                      )}
                      <span>Applied {formatDate(item.created_at)}</span>
                    </div>

                    {/* Live Waitlist Rank Pill */}
                    {isWaitlisted && item.rank != null && item.total != null && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF3C7]/80 text-[#78350F] border border-[#FDE68A] text-xs font-bold mt-1">
                        <Hourglass className="h-3 w-3 text-[#B45309] animate-pulse" />
                        <span>Waitlist Rank #{item.rank} of {item.total}</span>
                        <span className="text-[10px] font-normal text-[#92400E]">
                          (Evaluations in progress)
                        </span>
                      </div>
                    )}

                    {/* Admin Note snippet if rejected */}
                    {item.status === "rejected" && item.admin_note && (
                      <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive max-w-lg mt-1">
                        <span className="font-bold">Reviewer Note:</span> {item.admin_note}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDrawer(item.id)}
                      className="rounded-full text-xs font-semibold gap-1 h-8"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>

                    {isWaitlisted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleWithdraw(item)}
                        className="rounded-full text-xs font-medium text-muted-foreground hover:text-destructive h-8 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Withdraw"
                        )}
                      </Button>
                    )}

                    {isWithdrawn && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleReapply(item)}
                        className="rounded-full text-xs font-semibold gap-1.5 h-8 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        <span>Re-apply</span>
                      </Button>
                    )}

                    {isApproved && task?.slug && (
                      <Link href={`/tasks/${task.slug}`}>
                        <Button
                          size="sm"
                          className="rounded-full text-xs font-bold gap-1 h-8 shadow-2xs"
                        >
                          <span>Go to Workspace</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-card rounded-[14px] border border-border shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-base font-bold text-foreground">
            No applications found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeStatus !== "all"
              ? `You do not have any applications marked as "${activeStatus}".`
              : "You haven't submitted any applications to benchmark tasks yet."}
          </p>
          <div className="pt-2">
            <Link href="/tasks">
              <Button size="sm" className="rounded-full text-xs font-bold gap-1.5 shadow-2xs">
                <span>Browse Open Tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      <ApplicationDrawer
        applicationId={openId}
        onClose={handleCloseDrawer}
        initialApp={selectedApp}
      />
    </div>
  );
}
