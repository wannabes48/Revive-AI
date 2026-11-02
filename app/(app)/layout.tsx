import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { BottomNav } from "@/components/app/bottom-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, notificationsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  const approvalStatus =
    (profile as any)?.approval_status ||
    user.user_metadata?.approval_status ||
    "approved";

  // Account waitlist gate: unapproved users cannot access the dashboard or work areas
  if (
    profile?.role !== "admin" &&
    (approvalStatus === "waitlisted" || approvalStatus === "rejected")
  ) {
    redirect("/waitlist");
  }

  const unread = notificationsRes?.count ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={profile?.role} profile={profile} />
      <div className="md:pl-60 min-w-0">
        <Topbar profile={profile} unread={unread ?? 0} />
        <main className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-6 bottom-bar-padding md:pb-10 min-w-0">
          {children}
        </main>
        <BottomNav role={profile?.role} unread={unread ?? 0} />
      </div>
    </div>
  );
}
