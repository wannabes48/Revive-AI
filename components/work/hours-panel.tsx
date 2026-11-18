import { formatCents } from "@/lib/utils";
import { formatHoursMinutes } from "@/lib/format-time";
import { Clock, Hourglass, Sun, Wallet } from "lucide-react";

export interface HoursSummary {
  creditedSeconds: number;
  paidHours: number;
  pendingSeconds: number;
  todaySeconds: number;
}

const DAILY_LIMIT_SECONDS = 10 * 3600;

export function HoursPanel({ hours, rateCents }: { hours: HoursSummary; rateCents: number }) {
  const intoNextHour = hours.creditedSeconds % 3600;
  const progress = Math.round((intoNextHour / 3600) * 100);
  const todayPct = Math.min(100, Math.round((hours.todaySeconds / DAILY_LIMIT_SECONDS) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-1">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> Hours credited
        </span>
        <span className="font-heading font-bold text-xl text-foreground block">
          {formatHoursMinutes(hours.creditedSeconds)}
        </span>
        <span className="text-[11px] text-muted-foreground">Approved work time to date</span>
      </div>

      <div className="p-4 rounded-xl bg-[#0F766E]/5 border border-[#0F766E]/20 space-y-1.5">
        <span className="text-[10px] uppercase font-semibold text-[#0F766E] flex items-center gap-1.5">
          <Wallet className="h-3 w-3" /> Next paid hour
        </span>
        <span className="font-heading font-bold text-xl text-[#0F766E] block">{progress}%</span>
        <div className="h-1.5 rounded-full bg-[#0F766E]/15 overflow-hidden">
          <div className="h-full bg-[#0F766E] rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground">
          {hours.paidHours} hour{hours.paidHours === 1 ? "" : "s"} paid · {formatCents(hours.paidHours * rateCents)}
        </span>
      </div>

      <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-1">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
          <Hourglass className="h-3 w-3" /> Awaiting review
        </span>
        <span className="font-heading font-bold text-xl text-[#B45309] block">
          {formatHoursMinutes(hours.pendingSeconds)}
        </span>
        <span className="text-[11px] text-muted-foreground">Credited once approved</span>
      </div>

      <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-1.5">
        <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sun className="h-3 w-3" /> Counted today
        </span>
        <span className="font-heading font-bold text-xl text-foreground block">
          {formatHoursMinutes(hours.todaySeconds)}
        </span>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${todayPct >= 100 ? "bg-destructive" : "bg-foreground/60"}`}
            style={{ width: `${todayPct}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground">of the 10-hour daily limit</span>
      </div>
    </div>
  );
}
