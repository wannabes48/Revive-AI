import { requireAdmin } from "@/lib/auth";
import { ReviewQueue, ReviewQueueSubmission } from "@/components/admin/review-queue";
import { Task } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const { supabase } = await requireAdmin();

  // 1. Fetch pending submissions (oldest first)
  const { data: subsData, error: subsError } = await supabase
    .from("submissions")
    .select(`
      id,
      work_item_id,
      task_id,
      user_id,
      application_id,
      answers,
      seconds_spent,
      status,
      score,
      reviewer_id,
      reviewer_note,
      reviewed_at,
      earning_cents,
      created_at,
      task:tasks (
        id,
        slug,
        title,
        category,
        rate_cents,
        item_schema
      ),
      profile:profiles!submissions_user_id_fkey (
        id,
        full_name,
        email,
        expertise
      ),
      work_item:work_items (
        id,
        external_ref,
        payload
      )
    `)
    .eq("status", "submitted")
    .order("created_at", { ascending: true });

  if (subsError) {
    console.error("Error fetching review submissions:", subsError);
  }

  const rawSubmissions = subsData || [];

  // 2. Fetch distinct contributors' stats
  const contributorIds = Array.from(new Set(rawSubmissions.map((s: any) => s.user_id)));

  let contributorStatsMap: Record<
    string,
    { approvedCount: number; totalReviewed: number; approvalRate: number; avgScore: number | null }
  > = {};

  if (contributorIds.length > 0) {
    const { data: historicalSubs } = await supabase
      .from("submissions")
      .select("user_id, status, score")
      .in("user_id", contributorIds)
      .in("status", ["approved", "rejected"]);

    if (historicalSubs) {
      for (const uid of contributorIds) {
        const userSubs = historicalSubs.filter((s) => s.user_id === uid);
        const approvedCount = userSubs.filter((s) => s.status === "approved").length;
        const totalReviewed = userSubs.length;
        const approvalRate =
          totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 100;

        const scores = userSubs.filter((s) => s.score != null).map((s) => s.score!);
        const avgScore =
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null;

        contributorStatsMap[uid] = {
          approvedCount,
          totalReviewed,
          approvalRate,
          avgScore,
        };
      }
    }
  }

  // Enrich submissions with stats
  const enrichedSubmissions: ReviewQueueSubmission[] = rawSubmissions.map((s: any) => ({
    ...s,
    task: s.task || s.tasks,
    profile: s.profile || s.profiles,
    work_item: s.work_item || s.work_items,
    contributorStats: contributorStatsMap[s.user_id] || {
      approvedCount: 0,
      totalReviewed: 0,
      approvalRate: 100,
      avgScore: null,
    },
  }));

  // 3. Fetch all open tasks for filter
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .order("title");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <ReviewQueue submissions={enrichedSubmissions} tasks={(tasksData || []) as Task[]} />
    </div>
  );
}
