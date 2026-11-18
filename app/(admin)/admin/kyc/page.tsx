import { requireAdmin } from "@/lib/auth";
import {
  KycVerificationsTable,
  KycVerificationRow,
  type KycContributorOption,
} from "@/components/admin/kyc-verifications-table";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminKycPage() {
  const { supabase } = await requireAdmin();

  // 1. Query kyc_verifications table with profile join
  let verifications: KycVerificationRow[] = [];
  try {
    const { data, error } = await supabase
      .from("kyc_verifications")
      .select("*, profile:profiles(id, email, full_name, avatar_url, kyc_status)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      verifications = data as KycVerificationRow[];
    }
  } catch (err) {
    console.warn("Could not query kyc_verifications table:", err);
  }

  // 2. Also backfill any profiles that have kyc_status set but no separate audit row yet
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, avatar_url, kyc_status, country, didit_session_id, kyc_verified_at, created_at, updated_at"
      )
      .not("kyc_status", "is", null);

    if (profiles && profiles.length > 0) {
      const existingUserIds = new Set(verifications.map((v) => v.user_id));
      for (const p of profiles) {
        if (!existingUserIds.has(p.id) && p.kyc_status && p.kyc_status !== "unverified") {
          verifications.push({
            id: `profile_kyc_${p.id}`,
            user_id: p.id,
            session_id: p.didit_session_id || `manual_${p.id.slice(0, 8)}`,
            workflow_id: null,
            status: p.kyc_status,
            decision:
              p.kyc_status === "verified"
                ? "Approved"
                : p.kyc_status === "rejected"
                ? "Declined"
                : "In Review",
            document_type: "Government ID",
            country_code: p.country || "US",
            verified_at: p.kyc_verified_at || null,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
            profile: {
              id: p.id,
              email: p.email,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              kyc_status: p.kyc_status,
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not backfill profile KYC records:", err);
  }

  // 3. Contributor directory for manual KYC control + admin lock flags.
  //    select("*") so this keeps working before migration 009 adds kyc_locked.
  let contributors: KycContributorOption[] = [];
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "user")
      .order("created_at", { ascending: false });
    type ContributorRow = Omit<KycContributorOption, "kyc_locked"> & { kyc_locked?: boolean | null };
    contributors = ((data || []) as ContributorRow[]).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      kyc_status: p.kyc_status,
      kyc_locked: Boolean(p.kyc_locked),
    }));
    const lockMap = new Map(contributors.map((c) => [c.id, c.kyc_locked]));
    verifications = verifications.map((v) =>
      v.profile ? { ...v, profile: { ...v.profile, kyc_locked: lockMap.get(v.user_id) ?? false } } : v
    );
  } catch (err) {
    console.warn("Could not load contributors for manual KYC control:", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Didit.me KYC Verifications & Compliance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Review sovereign identity verification sessions, inspect raw payloads, and manually
              override KYC approvals.
            </p>
          </div>
        </div>
      </div>

      <KycVerificationsTable verifications={verifications} contributors={contributors} />
    </div>
  );
}
