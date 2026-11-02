import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Profile } from "@/lib/supabase/types";
import { UserDetailView } from "@/components/admin/user-detail-view";

export const dynamic = "force-dynamic";

interface AdminUserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { id } = await params;
  const { supabase, user: currentAdmin } = await requireAdmin();

  // Fetch target user profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Fetch user's applications joined with task details
  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      user_id,
      status,
      note,
      position,
      admin_note,
      created_at,
      updated_at,
      tasks (
        id,
        slug,
        title,
        category,
        pay_min,
        pay_max,
        pay_unit,
        location,
        commitment,
        status
      )
    `)
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <UserDetailView
        user={profile as Profile}
        initialApplications={applications || []}
        currentUserId={currentAdmin.id}
      />
    </div>
  );
}
