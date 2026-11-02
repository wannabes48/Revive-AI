import { createClient } from "@/lib/supabase/server";
import { profileCompleteness } from "@/lib/profile";
import { Profile, Task, Application, Notification } from "@/types";

export interface DashboardTask {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  pay_min: number | null;
  pay_max: number | null;
  pay_unit: string | null;
  commitment?: string | null;
  location?: string | null;
  score?: number;
}

export interface DashboardApp {
  id: string;
  status: "waitlisted" | "approved" | "rejected" | "withdrawn";
  created_at: string;
  updated_at: string;
  admin_note: string | null;
  position: number | null;
  rank?: number;
  total?: number;
  task: DashboardTask | null;
}

export async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const [profileRes, appsRes, tasksRes, notesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("applications")
      .select(`
        id,
        status,
        created_at,
        updated_at,
        admin_note,
        position,
        task:tasks(id, slug, title, summary, category, pay_min, pay_max, pay_unit, commitment, location)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, slug, title, summary, category, pay_min, pay_max, pay_unit, commitment, location")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profile = (profileRes.data as Profile) || null;
  const rawApps = (appsRes.data as unknown as DashboardApp[]) ?? [];

  // Parallel compute waitlist rank for waitlisted applications
  const apps: DashboardApp[] = await Promise.all(
    rawApps.map(async (app) => {
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
        } catch {
          // fallback to app
        }
      }
      return app;
    })
  );

  const appliedTaskIds = new Set(apps.map((a) => a.task?.id).filter(Boolean));

  const counts = {
    waitlisted: apps.filter((a) => a.status === "waitlisted").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    total: apps.length,
  };

  // Match score: category equals expertise (+3), skill appears in title or summary (+1 each)
  const skills = (profile?.skills ?? []).map((s: string) => s.toLowerCase());
  const tasksList = (tasksRes.data as unknown as DashboardTask[]) ?? [];
  const recommended = tasksList
    .filter((t) => !appliedTaskIds.has(t.id))
    .map((t) => {
      const text = `${t.title} ${t.summary || ""}`.toLowerCase();
      const score =
        (t.category === profile?.expertise ? 3 : 0) +
        skills.filter((s: string) => text.includes(s)).length;
      return { ...t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    profile,
    counts,
    recommended,
    approved: apps.filter((a) => a.status === "approved"),
    recent: apps.slice(0, 5),
    notifications: (notesRes.data as Notification[]) ?? [],
    completeness: profileCompleteness(profile),
  };
}
