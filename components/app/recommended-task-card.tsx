import Link from "next/link";
import { DashboardTask } from "@/lib/dashboard";
import { formatPay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MapPin, Clock } from "lucide-react";

interface RecommendedTaskCardProps {
  task: DashboardTask;
}

export function RecommendedTaskCard({ task }: RecommendedTaskCardProps) {
  return (
    <div className="bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between gap-3 group">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {task.category}
          </span>
          {task.score != null && task.score > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-2.5 w-2.5" />
              Top Match
            </span>
          )}
        </div>

        <Link href={`/tasks/${task.slug}`}>
          <h4 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {task.title}
          </h4>
        </Link>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.summary}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
          {task.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.location}
            </span>
          )}
          {task.commitment && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.commitment}
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-foreground">
          {formatPay(task.pay_min, task.pay_max, task.pay_unit)}
        </span>

        <Link href={`/tasks/${task.slug}`}>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-xs font-semibold gap-1 h-8 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
          >
            <span>Apply</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
