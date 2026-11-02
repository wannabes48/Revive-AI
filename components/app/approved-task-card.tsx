import Link from "next/link";
import { DashboardApp } from "@/lib/dashboard";
import { formatDate, formatPay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Award, ChevronRight, MessageSquare } from "lucide-react";

interface ApprovedTaskCardProps {
  app: DashboardApp;
}

export function ApprovedTaskCard({ app }: ApprovedTaskCardProps) {
  const task = app.task;

  return (
    <div className="p-4 sm:p-5 rounded-[14px] bg-card border border-primary/30 shadow-2xs flex flex-col justify-between gap-4 transition-all hover:border-primary/60">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {task?.category || "Specialized Task"}
          </span>
          <span className="text-xs font-bold text-primary font-mono">
            {formatPay(task?.pay_min, task?.pay_max, task?.pay_unit)}
          </span>
        </div>

        <div>
          <h4 className="font-heading font-bold text-base text-foreground leading-snug">
            {task?.title || "Evaluation Task"}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approved on {formatDate(app.updated_at || app.created_at)}
          </p>
        </div>

        {app.admin_note && (
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/90 space-y-1">
            <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Lead Reviewer Note
            </span>
            <p className="text-xs italic leading-relaxed">&ldquo;{app.admin_note}&rdquo;</p>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {task?.commitment || "Flexible Schedule"}
        </span>

        <Link href={`/work/${task?.slug || task?.id || ""}`}>
          <Button size="sm" className="rounded-full text-xs font-bold gap-1.5 h-8 shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90">
            <span>Start working</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
