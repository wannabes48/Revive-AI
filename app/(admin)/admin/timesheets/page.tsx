import { requireAdmin } from "@/lib/auth";
import { TimesheetsQueue, AdminTimeEntryRow } from "@/components/admin/timesheets-queue";

export const dynamic = "force-dynamic";

export default async function AdminTimesheetsPage() {
  const { supabase } = await requireAdmin();

  const { data: timesData, error: timesError } = await supabase
    .from("time_entries")
    .select(`
      id,
      user_id,
      application_id,
      task_id,
      work_date,
      minutes,
      description,
      status,
      created_at,
      task:tasks (
        id,
        title,
        category,
        rate_cents
      ),
      profile:profiles!time_entries_user_id_fkey (
        id,
        full_name,
        email
      ),
      application:applications (
        id,
        rate_cents
      )
    `)
    .eq("status", "submitted")
    .order("work_date", { ascending: false });

  if (timesError) {
    console.error("Error fetching timesheets:", timesError);
  }

  const rawEntries = timesData || [];

  const entries: AdminTimeEntryRow[] = rawEntries.map((e: any) => {
    const rate = (e.application || e.applications)?.rate_cents ?? (e.task || e.tasks)?.rate_cents ?? 0;
    const owed = Math.round((e.minutes * rate) / 60);

    return {
      id: e.id,
      user_id: e.user_id,
      application_id: e.application_id,
      task_id: e.task_id,
      work_date: e.work_date,
      minutes: e.minutes,
      description: e.description,
      status: e.status,
      created_at: e.created_at,
      effectiveRate: rate,
      estimatedOwed: owed,
      task: e.task || e.tasks,
      profile: e.profile || e.profiles,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <TimesheetsQueue entries={entries} />
    </div>
  );
}
