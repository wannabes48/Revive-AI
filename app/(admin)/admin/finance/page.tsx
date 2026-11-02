import { requireAdmin } from "@/lib/auth";
import { FinanceOverview, TaskSpendMetric } from "@/components/admin/finance-overview";
import { LedgerEntry } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const { supabase } = await requireAdmin();

  // 1. Fetch ledger entries
  const { data: ledgerRows } = await supabase
    .from("ledger_entries")
    .select("id, user_id, kind, amount_cents, currency, available_at, ref_type, ref_id, idempotency_key, note, created_by, created_at")
    .order("created_at", { ascending: false });

  // 2. Fetch profiles for user mapping & dropdown
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Combine ledger with profile
  const enrichedLedger = (ledgerRows || []).map((e: any) => ({
    ...e,
    profile: profileMap.get(e.user_id) || undefined,
  }));

  // 3. Compute system solvency liability and monthly figures
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let owedAvailableCents = 0;
  let pendingHoldCents = 0;
  let earnedThisMonthCents = 0;
  let paidOutThisMonthCents = 0;

  for (const entry of ledgerRows || []) {
    const isAvailable = new Date(entry.available_at) <= now;
    if (isAvailable) {
      owedAvailableCents += entry.amount_cents;
    } else {
      pendingHoldCents += entry.amount_cents;
    }

    // Monthly flow
    if (entry.created_at >= startOfMonth) {
      if ((entry.kind === "earning" || entry.kind === "bonus" || entry.kind === "adjustment") && entry.amount_cents > 0) {
        earnedThisMonthCents += entry.amount_cents;
      }
      if (entry.kind === "payout") {
        paidOutThisMonthCents += Math.abs(entry.amount_cents);
      }
    }
  }

  const totalOwedLiabilityCents = owedAvailableCents + pendingHoldCents;

  // 4. Open payout requests
  const { data: openPayouts } = await supabase
    .from("payout_requests")
    .select("amount_cents, status")
    .in("status", ["requested", "processing"]);

  const openPayoutRequestsCount = (openPayouts || []).length;
  const openPayoutRequestsCents = (openPayouts || []).reduce(
    (acc: number, p: any) => acc + (p.amount_cents || 0),
    0
  );

  // 5. Tasks and task spend metrics
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, slug, budget_cents")
    .order("created_at", { ascending: false });

  const { data: approvedSubmissions } = await supabase
    .from("submissions")
    .select("task_id, earning_cents")
    .eq("status", "approved");

  const { data: approvedTimeEntries } = await supabase
    .from("time_entries")
    .select("task_id, earning_cents")
    .eq("status", "approved");

  const taskSpends: TaskSpendMetric[] = (tasks || []).map((t: any) => {
    const taskSubs = (approvedSubmissions || []).filter((s: any) => s.task_id === t.id);
    const taskTimes = (approvedTimeEntries || []).filter((te: any) => te.task_id === t.id);

    const subSpend = taskSubs.reduce((acc: number, s: any) => acc + (s.earning_cents || 0), 0);
    const timeSpend = taskTimes.reduce((acc: number, te: any) => acc + (te.earning_cents || 0), 0);
    const totalSpentCents = subSpend + timeSpend;
    const approvedCount = taskSubs.length;
    const costPerApprovedItemCents = approvedCount > 0 ? Math.round(totalSpentCents / approvedCount) : null;

    return {
      id: t.id,
      title: t.title,
      slug: t.slug,
      budget_cents: t.budget_cents,
      totalSpentCents,
      approvedCount,
      costPerApprovedItemCents,
    };
  });

  const contributors = (profiles || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }));

  return (
    <FinanceOverview
      metrics={{
        earnedThisMonthCents,
        paidOutThisMonthCents,
        pendingHoldCents,
        owedAvailableCents,
        totalOwedLiabilityCents,
        openPayoutRequestsCount,
        openPayoutRequestsCents,
      }}
      taskSpends={taskSpends}
      ledger={enrichedLedger}
      contributors={contributors}
    />
  );
}
