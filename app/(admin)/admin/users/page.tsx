import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { UsersTable, UserProfileRow } from "@/components/admin/users-table";
import { Users, ShieldCheck, UserCheck, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface AdminUsersPageProps {
  searchParams?: Promise<{ user?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { supabase, user } = await requireAdmin();
  const resolvedParams = searchParams ? await searchParams : undefined;

  const [profilesRes, authUsersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, applications(count)")
      .order("created_at", { ascending: false }),
    (async () => {
      try {
        const adminClient = createAdminClient();
        const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        return data?.users || [];
      } catch {
        return [];
      }
    })(),
  ]);

  const authMap = new Map<string, any>();
  authUsersRes.forEach((u) => {
    authMap.set(u.id, u.user_metadata || {});
  });

  const rawUsers = (profilesRes.data || []) as unknown as UserProfileRow[];
  const users: UserProfileRow[] = rawUsers.map((p) => {
    const meta = authMap.get(p.id) || {};
    return {
      ...p,
      approval_status: p.approval_status || meta.approval_status || "approved",
      kyc_status: p.kyc_status || meta.kyc_status || "unverified",
    };
  });

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === "admin").length;
  const contributorUsers = users.filter((u) => u.role === "user").length;
  const waitlistedUsers = users.filter((u) => u.approval_status === "waitlisted").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border/60">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Platform User Accounts & Admissions
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Directory of registered domain specialists, admissions waitlist, and system administrators.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Registered Accounts</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-foreground">{totalUsers}</p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-medium">Admissions Waitlist</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-amber-600">{waitlistedUsers}</p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#0F766E] mb-1">
            <span className="text-xs font-medium">Administrators</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[#0F766E]">{adminUsers}</p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Approved Contributors</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-foreground">
            {users.filter((u) => u.approval_status === "approved" && u.role === "user").length}
          </p>
        </div>
      </div>

      {/* Table Component */}
      <UsersTable
        currentUserId={user.id}
        users={users}
        initialUserId={resolvedParams?.user}
      />
    </div>
  );
}
