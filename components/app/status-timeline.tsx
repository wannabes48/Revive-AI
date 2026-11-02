import { ApplicationEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, RotateCcw, AlertCircle } from "lucide-react";

interface StatusTimelineProps {
  events: ApplicationEvent[];
  appliedDate?: string;
}

export function StatusTimeline({ events = [], appliedDate }: StatusTimelineProps) {
  const getEventIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
      case "rejected":
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case "withdrawn":
        return <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />;
      case "waitlisted":
      default:
        return <Clock className="h-3.5 w-3.5 text-amber-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Application Approved";
      case "rejected":
        return "Not Selected";
      case "withdrawn":
        return "Application Withdrawn";
      case "waitlisted":
      default:
        return "Joined Waitlist";
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative pl-6 border-l-2 border-border/80 space-y-6 ml-2">
        {events.length > 0 ? (
          events.map((evt, idx) => (
            <div key={evt.id || idx} className="relative space-y-1">
              {/* Dot Icon on the line */}
              <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-card border-2 border-border flex items-center justify-center">
                {getEventIcon(evt.status)}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  {getStatusLabel(evt.status)}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDate(evt.created_at)}
                </span>
              </div>

              {evt.message && (
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-foreground/90 leading-relaxed mt-1">
                  {evt.message}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="relative space-y-1">
            <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-card border-2 border-primary/40 flex items-center justify-center">
              <Clock className="h-3 w-3 text-primary" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Application Submitted</span>
              {appliedDate && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDate(appliedDate)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Candidate profile queued for review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
