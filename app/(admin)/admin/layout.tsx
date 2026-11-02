import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminNav
        userEmail={user.email}
        adminName={profile?.full_name || undefined}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
