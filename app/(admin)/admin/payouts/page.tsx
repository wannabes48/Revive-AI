import { requireAdmin } from "@/lib/auth";
import { PayoutQueue, AdminPayoutRow } from "@/components/admin/payout-queue";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const { supabase } = await requireAdmin();

  // 1. Fetch payout requests
  const { data: payoutsData, error: payoutsError } = await supabase
    .from("payout_requests")
    .select(`
      id,
      user_id,
      method_id,
      method_snapshot,
      amount_cents,
      fee_cents,
      local_currency,
      local_amount,
      fx_rate,
      status,
      provider,
      provider_ref,
      failure_reason,
      requested_at,
      processed_at,
      processed_by,
      profile:profiles!payout_requests_user_id_fkey (
        id,
        full_name,
        email,
        created_at,
        payouts_blocked
      )
    `)
    .order("requested_at", { ascending: false });

  if (payoutsError) {
    console.error("Error fetching payouts:", payoutsError);
  }

  const rawPayouts = payoutsData || [];

  // 2. Compute contributor risk signals
  const userIds = Array.from(new Set(rawPayouts.map((p: any) => p.user_id)));

  const { data: userSubs } = await supabase
    .from("submissions")
    .select("user_id, status")
    .in("user_id", userIds);

  const { data: allMethods } = await supabase
    .from("payout_methods")
    .select("user_id, details");

  const enrichedPayouts: AdminPayoutRow[] = rawPayouts.map((p: any) => {
    const subs = (userSubs || []).filter((s) => s.user_id === p.user_id);
    const approvedCount = subs.filter((s) => s.status === "approved").length;
    const approvalRate = subs.length > 0 ? Math.round((approvedCount / subs.length) * 100) : 100;

    const otherPayoutsCount = rawPayouts.filter(
      (op: any) => op.user_id === p.user_id && op.status === "paid" && op.id !== p.id
    ).length;

    // Check shared method details (phone or email on other users)
    const phoneOrEmail =
      p.method_snapshot?.details?.phone || p.method_snapshot?.details?.email;

    let isMethodShared = false;
    if (phoneOrEmail) {
      const match = (allMethods || []).find(
        (m) =>
          m.user_id !== p.user_id &&
          (m.details?.phone === phoneOrEmail || m.details?.email === phoneOrEmail)
      );
      if (match) isMethodShared = true;
    }

    return {
      ...p,
      profile: p.profile || p.profiles,
      contributorStats: {
        approvedCount,
        approvalRate,
        otherPayoutsCount,
        isMethodShared,
      },
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <PayoutQueue payouts={enrichedPayouts} />
    </div>
  );
}
