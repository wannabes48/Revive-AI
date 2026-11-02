import Link from "next/link";
import { Task } from "@/lib/supabase/types";
import { formatPay } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Clock, MapPin, DollarSign, Users, ArrowRight } from "lucide-react";

interface TaskCardProps {
  task: Task;
  featured?: boolean;
}

export function TaskCard({ task, featured }: TaskCardProps) {
  const payFormatted = formatPay(task.pay_min, task.pay_max, task.pay_unit || "hour");

  return (
    <article className="group bg-card rounded-[14px] border border-border p-5 sm:p-6 shadow-2xs hover:border-primary hover:shadow-md transition-all duration-200 flex flex-col justify-between relative">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {task.category}
            </span>
          </div>

          {task.slots != null && task.slots > 0 && (
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {task.slots} slots available
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/tasks/${task.slug}`}>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-2">
            {task.title}
          </h3>
        </Link>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
          {task.summary}
        </p>

        {/* Metadata Chips */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-muted-foreground pt-1 pb-4">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{payFormatted}</span>
          </div>

          {task.commitment && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
              <span>{task.commitment}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span>{task.location || "Remote"}</span>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
        <span className="text-xs text-muted-foreground">
          48h review window
        </span>

        <Link
          href={`/tasks/${task.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform"
        >
          <span>View Task Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
