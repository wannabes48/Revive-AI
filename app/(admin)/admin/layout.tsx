import { requireAdmin } from "@/lib/auth";
import { AdminSidebarLayout } from "@/components/admin/admin-sidebar-layout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <AdminSidebarLayout
      userEmail={user.email}
      adminName={profile?.full_name || undefined}
      avatarUrl={profile?.avatar_url || undefined}
    >
      {children}
    </AdminSidebarLayout>
  );
}
