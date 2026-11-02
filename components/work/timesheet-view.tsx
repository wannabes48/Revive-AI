"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { logTime, deleteTimeEntry } from "@/actions/work";
import { formatDate, formatCents, formatMinutes } from "@/lib/utils";
import { TimeEntry } from "@/lib/supabase/types";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Hourglass,
  DollarSign,
} from "lucide-react";

interface TimesheetViewProps {
  taskId: string;
  slug: string;
  rateCents: number;
  entries: TimeEntry[];
}

export function TimesheetView({
  taskId,
  slug,
  rateCents,
  entries: initialEntries,
}: TimesheetViewProps) {
  const router = useRouter();

  // 14 days ago in YYYY-MM-DD
  const minDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  }, []);

  const todayStr = React.useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const [workDate, setWorkDate] = React.useState(todayStr);
  const [hours, setHours] = React.useState("");
  const [minutes, setMinutes] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const totalLoggedMinutes = entriesTotal(initialEntries.filter((e) => e.status !== "rejected"));
  const approvedEarnings = initialEntries
    .filter((e) => e.status === "approved")
    .reduce((acc, curr) => acc + (curr.earning_cents || 0), 0);

  function entriesTotal(list: TimeEntry[]) {
    return list.reduce((acc, curr) => acc + curr.minutes, 0);
  }

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();

    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    const totalMins = h * 60 + m;

    if (totalMins <= 0) {
      toast.error("Please enter a valid duration greater than 0 minutes.");
      return;
    }

    if (totalMins > 720) {
      toast.error("You cannot log more than 12 hours (720 minutes) in a single entry.");
      return;
    }

    if (!description.trim()) {
      toast.error("A description of the work performed is required.");
      return;
    }

    setIsSubmitting(true);
    const res = await logTime(taskId, workDate, totalMins, description);
    setIsSubmitting(false);

    if (res.error) {
      toast.error("Failed to log time", { description: res.error });
    } else {
      toast.success("Time entry submitted", {
        description: `${formatMinutes(totalMins)} logged for ${formatDate(workDate)}.`,
      });
      setHours("");
      setMinutes("");
      setDescription("");
      router.refresh();
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm("Are you sure you want to remove this pending time entry?")) return;

    setDeletingId(entryId);
    const res = await deleteTimeEntry(entryId);
    setDeletingId(null);

    if (res.error) {
      toast.error("Could not delete entry", { description: res.error });
    } else {
      toast.success("Time entry deleted.");
      router.refresh();
    }
  }

  const columns: ColumnDef<TimeEntry>[] = [
    {
      header: "Date",
      priority: "primary",
      cell: (entry) => (
        <span className="font-medium text-foreground">
          {formatDate(entry.work_date)}
        </span>
      ),
    },
    {
      header: "Duration",
      priority: "primary",
      cell: (entry) => (
        <span className="font-bold text-foreground">
          {formatMinutes(entry.minutes)}
        </span>
      ),
    },
    {
      header: "Description",
      priority: "primary",
      cell: (entry) => (
        <div className="max-w-sm break-words text-foreground/90">
          <p className="line-clamp-2 sm:line-clamp-none">{entry.description}</p>
          {entry.reviewer_note && (
            <span className="block text-[11px] text-destructive italic mt-0.5">
              Note: {entry.reviewer_note}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      priority: "primary",
      cell: (entry) => (
        <div>
          {entry.status === "approved" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </span>
          ) : entry.status === "rejected" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-3 w-3" />
              Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
              <Hourglass className="h-3 w-3" />
              Submitted
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Earnings",
      cell: (entry) => (
        <span className="font-mono font-bold text-foreground">
          {entry.earning_cents != null ? formatCents(entry.earning_cents) : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (entry) => {
        const isDeleting = deletingId === entry.id;
        if (entry.status !== "submitted") return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => handleDelete(entry.id)}
            className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            title="Delete pending entry"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Hourly Compensation Rate
          </span>
          <p className="font-heading font-extrabold text-2xl text-foreground mt-1">
            {formatCents(rateCents)}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Total Hours Logged
          </span>
          <p className="font-heading font-extrabold text-2xl text-foreground mt-1">
            {formatMinutes(totalLoggedMinutes)}
          </p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Approved Earnings
          </span>
          <p className="font-heading font-extrabold text-2xl text-[#0F766E] mt-1">
            {formatCents(approvedEarnings)}
          </p>
        </div>
      </div>

      {/* Log Time Form */}
      <div className="bg-card rounded-[14px] border border-border p-5 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Log Work Session
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log time worked within the last 14 days. Daily limit is 12 hours.
          </p>
        </div>

        <form onSubmit={handleLogTime} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="work_date" className="text-xs font-semibold">
                Date Worked
              </Label>
              <Input
                id="work_date"
                type="date"
                min={minDate}
                max={todayStr}
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
                className="text-xs h-9 bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hours_input" className="text-xs font-semibold">
                Hours
              </Label>
              <Input
                id="hours_input"
                type="number"
                min="0"
                max="12"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="text-xs h-9 bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minutes_input" className="text-xs font-semibold">
                Minutes
              </Label>
              <Input
                id="minutes_input"
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="text-xs h-9 bg-background"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work_description" className="text-xs font-semibold">
              Description of Work Performed *
            </Label>
            <Textarea
              id="work_description"
              placeholder="e.g. Evaluated 25 biomedical reasoning chains for oncological contraindications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={2}
              className="text-xs bg-background"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full text-xs font-bold gap-1.5 h-8 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Submit Timesheet Entry</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Logged Timesheets Table */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h4 className="font-heading font-bold text-sm text-foreground">
            Timesheet History ({initialEntries.length})
          </h4>
        </div>

        <ResponsiveTable
          data={initialEntries}
          keyExtractor={(entry) => entry.id}
          columns={columns}
          emptyMessage="No timesheet sessions logged yet. Use the form above to record completed hours."
        />
      </div>
    </div>
  );
}
