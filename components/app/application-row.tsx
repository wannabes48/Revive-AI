import Link from "next/link";
import { DashboardApp } from "@/lib/dashboard";
import { formatDate, formatPay } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Hourglass, ChevronRight } from "lucide-react";

interface ApplicationRowProps {
  app: DashboardApp;
}

export function ApplicationRow({ app }: ApplicationRowProps) {
  const task = app.task;
  const isWaitlisted = app.status === "waitlisted";

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/applications?open=${app.id}`}
            className="font-heading font-bold text-foreground hover:text-primary transition-colors text-sm truncate"
          >
            {task?.title || "Specialized Task"}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-muted-foreground">
          {task?.category && <span>{task.category}</span>}
          <span>•</span>
          <span>Applied {formatDate(app.created_at)}</span>
          {task && (
            <>
              <span>•</span>
              <span className="font-semibold text-foreground">
                {formatPay(task.pay_min, task.pay_max, task.pay_unit)}
              </span>
            </>
          )}
        </div>

        {/* Live waitlist rank badge */}
        {isWaitlisted && app.rank != null && app.total != null && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#78350F] border border-[#FDE68A] text-[11px] font-bold mt-1">
            <Hourglass className="h-3 w-3 text-[#B45309]" />
            <span>#{app.rank} of {app.total} on the waitlist</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
        <StatusBadge status={app.status} pulsing={isWaitlisted} />
        <Link
          href={`/applications?open=${app.id}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 p-1"
        >
          <span>Details</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
