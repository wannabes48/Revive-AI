import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Task, Application } from "@/lib/supabase/types";
import { ApplicationsView, JoinedAppWithRank } from "@/components/app/applications-view";

export const dynamic = "force-dynamic";

interface ApplicationsPageProps {
  searchParams?: Promise<{ status?: string; open?: string; q?: string }>;
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const statusFilter = resolvedParams?.status;
  const openId = resolvedParams?.open;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/applications");
  }

  // Fetch all applications for current user with joined tasks
  const { data, error } = await supabase
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rawApplications = (data as unknown as (Application & { tasks: Task | null })[]) || [];

  // Parallel fetch live waitlist ranks for waitlisted applications
  const applicationsWithRank: JoinedAppWithRank[] = await Promise.all(
    rawApplications.map(async (app) => {
      if (app.status === "waitlisted") {
        try {
          const { data: rankData } = await supabase.rpc("my_waitlist_rank", {
            p_application_id: app.id,
          });
          if (rankData && rankData.length > 0) {
            return {
              ...app,
              rank: Number(rankData[0].rank),
              total: Number(rankData[0].total),
            };
          }
        } catch (err) {
          console.warn("Could not calculate waitlist rank for application:", app.id, err);
        }
      }
      return app;
    })
  );

  return (
    <ApplicationsView
      initialApplications={applicationsWithRank}
      initialStatus={statusFilter}
      initialOpenId={openId}
    />
  );
}
