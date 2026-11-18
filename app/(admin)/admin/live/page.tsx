import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatCents, formatDateTime } from "@/lib/utils";
import { formatHoursMinutes } from "@/lib/format-time";
import { Activity, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  last_beat_at: string;
  active_seconds: number;
  profile: { full_name: string | null; email: string } | null;
  task: { title: string; slug: string } | null;
};

export default async function AdminLiveWorkPage() {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = startOfDay.getUTCDay() || 7;
  const startOfWeek = new Date(startOfDay.getTime() - (day - 1) * 86400000);

  const [runningRes, weekRes, tasksRes, creditsRes, hourLedgerRes] = await Promise.all([
    supabase
      .from("work_sessions")
      .select(
        "id, user_id, task_id, started_at, last_beat_at, active_seconds, profile:profiles!work_sessions_user_id_fkey(full_name, email), task:tasks(title, slug)"
      )
      .eq("status", "running")
      .order("started_at", { ascending: true }),
    supabase
      .from("work_sessions")
      .select("task_id, user_id, started_at, active_seconds")
      .gte("started_at", startOfWeek.toISOString()),
    supabase
      .from("tasks")
      .select("id, title, slug, status, rate_cents, budget_cents")
      .eq("pay_model", "hourly")
      .order("title"),
    supabase.from("hour_credits").select("application_id, credited_seconds, paid_hours, application:applications(task_id)"),
    supabase.from("ledger_entries").select("ref_id, amount_cents").eq("ref_type", "hour"),
  ]);

  const migrationMissing = Boolean(runningRes.error);
  if (runningRes.error) console.warn("Live work unavailable (is migration 013 applied?):", runningRes.error.message);

  const running = (runningRes.data || []) as unknown as SessionRow[];
  const userIds = running.map((r) => r.user_id);
  const { data: held } = userIds.length
    ? await supabase
        .from("work_items")
        .select("id, task_id, claimed_by, external_ref")
        .eq("status", "claimed")
        .in("claimed_by", userIds)
    : { data: [] as { id: string; task_id: string; claimed_by: string; external_ref: string | null }[] };

  // Per-task aggregates
  const week = weekRes.data || [];
  const todaySecondsByTask = new Map<string, number>();
  const weekSecondsByTask = new Map<string, number>();
  for (const s of week) {
    const secs = Number(s.active_seconds) || 0;
    weekSecondsByTask.set(s.task_id, (weekSecondsByTask.get(s.task_id) || 0) + secs);
    if (new Date(s.started_at) >= startOfDay) {
      todaySecondsByTask.set(s.task_id, (todaySecondsByTask.get(s.task_id) || 0) + secs);
    }
  }

  const creditRows = (creditsRes.data || []) as unknown as {
    application_id: string;
    credited_seconds: number;
    paid_hours: number;
    application: { task_id: string } | null;
  }[];
  const paidHoursByTask = new Map<string, number>();
  const taskByApp = new Map<string, string>();
  for (const c of creditRows) {
    const taskId = c.application?.task_id;
    if (!taskId) continue;
    taskByApp.set(c.application_id, taskId);
    paidHoursByTask.set(taskId, (paidHoursByTask.get(taskId) || 0) + Number(c.paid_hours));
  }
  const spendByTask = new Map<string, number>();
  for (const l of hourLedgerRes.data || []) {
    const taskId = taskByApp.get(l.ref_id as string);
    if (taskId) spendByTask.set(taskId, (spendByTask.get(taskId) || 0) + Number(l.amount_cents));
  }

  const nowMs = now.getTime();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="pb-4 border-b border-border/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shrink-0">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Live Work</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Contributors with a running work clock, and counted hours on hourly tasks.
          </p>
        </div>
      </div>

      {migrationMissing && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          Apply <code className="font-mono">supabase/013_batches_and_work_clock.sql</code> to enable the work clock.
        </div>
      )}

      <section className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center gap-2">
          <Radio className="h-4 w-4 text-[#0F766E]" />
          <h2 className="font-heading font-bold text-sm text-foreground">Running clocks ({running.length})</h2>
        </div>
        {running.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Nobody is working right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Contributor</th>
                  <th className="text-left font-semibold px-4 py-2.5">Task</th>
                  <th className="text-left font-semibold px-4 py-2.5">Session start</th>
                  <th className="text-right font-semibold px-4 py-2.5">Counted this session</th>
                  <th className="text-left font-semibold px-4 py-2.5">Last heartbeat</th>
                  <th className="text-left font-semibold px-4 py-2.5">Current item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {running.map((r) => {
                  const ageSec = Math.round((nowMs - new Date(r.last_beat_at).getTime()) / 1000);
                  const item = (held || []).find((h) => h.claimed_by === r.user_id && h.task_id === r.task_id);
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${r.user_id}`} className="font-semibold text-foreground hover:text-primary">
                          {r.profile?.full_name || r.profile?.email || r.user_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{r.task?.title || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.started_at)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatHoursMinutes(r.active_seconds)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            ageSec <= 60 ? "text-[#0F766E]" : ageSec <= 120 ? "text-[#B45309]" : "text-destructive"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ageSec <= 60 ? "bg-[#0F766E]" : ageSec <= 120 ? "bg-amber-500" : "bg-destructive"}`} />
                          {ageSec < 60 ? `${ageSec}s ago` : `${Math.round(ageSec / 60)}m ago`}
                          {ageSec > 120 && " (disconnected)"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {item ? item.external_ref || item.id.slice(0, 8) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <h2 className="font-heading font-bold text-sm text-foreground">Hourly tasks</h2>
          <p className="text-[11px] text-muted-foreground">Counted time (UTC day / week) and paid hours against budget.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Task</th>
                <th className="text-right font-semibold px-4 py-2.5">Counted today</th>
                <th className="text-right font-semibold px-4 py-2.5">Counted this week</th>
                <th className="text-right font-semibold px-4 py-2.5">Paid hours</th>
                <th className="text-right font-semibold px-4 py-2.5">Spend / budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(tasksRes.data || []).map((t) => {
                const spend = spendByTask.get(t.id) || 0;
                const pct = t.budget_cents ? Math.round((spend / Number(t.budget_cents)) * 100) : null;
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/tasks/${t.id}/items`} className="font-semibold text-foreground hover:text-primary">
                        {t.title}
                      </Link>
                      {t.status !== "open" && (
                        <span className="ml-2 text-[10px] uppercase font-bold text-muted-foreground">{t.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatHoursMinutes(todaySecondsByTask.get(t.id) || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatHoursMinutes(weekSecondsByTask.get(t.id) || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{paidHoursByTask.get(t.id) || 0}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCents(spend)}
                      {t.budget_cents ? (
                        <span className={`block text-[10px] ${pct !== null && pct >= 90 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                          of {formatCents(Number(t.budget_cents))} ({pct}%)
                        </span>
                      ) : (
                        <span className="block text-[10px] text-muted-foreground">no budget set</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(tasksRes.data || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No hourly tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
