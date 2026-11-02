import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EarningsView, HourlyTaskInfo } from "@/components/earnings/earnings-view";
import { WalletBalance, TimeEntry } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch wallet balance
  let wallet: WalletBalance = {
    available_cents: 0,
    pending_cents: 0,
    lifetime_earned_cents: 0,
    lifetime_paid_cents: 0,
  };

  const { data: walletData, error: walletErr } = await supabase.rpc("my_wallet");
  if (!walletErr && walletData && walletData[0]) {
    wallet = {
      available_cents: Number(walletData[0].available_cents || 0),
      pending_cents: Number(walletData[0].pending_cents || 0),
      lifetime_earned_cents: Number(walletData[0].lifetime_earned_cents || 0),
      lifetime_paid_cents: Number(walletData[0].lifetime_paid_cents || 0),
    };
  } else {
    // Direct computation fallback from ledger
    const { data: entries } = await supabase
      .from("ledger_entries")
      .select("amount_cents, kind, available_at")
      .eq("user_id", user.id);

    if (entries) {
      const now = Date.now();
      let available = 0;
      let pending = 0;
      let earned = 0;
      let paid = 0;

      for (const e of entries) {
        const amt = Number(e.amount_cents);
        const availTime = new Date(e.available_at).getTime();
        if (availTime <= now) {
          available += amt;
        } else {
          pending += amt;
        }

        if (e.kind === "earning" || e.kind === "bonus") {
          earned += amt;
        }
        if (e.kind === "payout" || e.kind === "payout_reversal") {
          paid -= amt;
        }
      }

      wallet = {
        available_cents: Math.max(0, available),
        pending_cents: Math.max(0, pending),
        lifetime_earned_cents: Math.max(0, earned),
        lifetime_paid_cents: Math.max(0, paid),
      };
    }
  }

  // Fetch ledger entries
  const { data: ledger } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch payout requests
  const { data: payouts } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  // Fetch payout methods
  const { data: methods } = await supabase
    .from("payout_methods")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  // Fetch profile for payouts_blocked
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch approved hourly applications for conditional Timesheet tab
  const { data: approvedApps } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      rate_cents,
      tasks (
        id,
        slug,
        title,
        pay_model,
        rate_cents
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "approved");

  const hourlyTasks: HourlyTaskInfo[] = (approvedApps || [])
    .filter((a: any) => a.tasks?.pay_model === "hourly")
    .map((a: any) => ({
      appId: a.id,
      taskId: a.tasks.id,
      slug: a.tasks.slug,
      title: a.tasks.title,
      rateCents: a.rate_cents ?? a.tasks.rate_cents ?? 0,
    }));

  let timeEntries: TimeEntry[] = [];
  if (hourlyTasks.length > 0) {
    const { data: times } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("work_date", { ascending: false });
    timeEntries = (times || []) as TimeEntry[];
  }

  return (
    <div className="max-w-6xl mx-auto">
      <EarningsView
        wallet={wallet}
        ledger={ledger || []}
        payouts={payouts || []}
        methods={methods || []}
        profile={profile || ({} as any)}
        hourlyTasks={hourlyTasks}
        timeEntries={timeEntries}
      />
    </div>
  );
}
