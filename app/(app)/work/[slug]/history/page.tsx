import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  Star,
  MessageSquare,
  Clock,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface SubmissionHistoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SubmissionHistoryPage({
  params,
}: SubmissionHistoryPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch task
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, slug, title, category")
    .eq("slug", slug)
    .single();

  if (taskError || !task) {
    notFound();
  }

  // Fetch submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select(`
      id,
      work_item_id,
      answers,
      seconds_spent,
      status,
      score,
      reviewer_note,
      reviewed_at,
      earning_cents,
      created_at,
      work_items (
        external_ref,
        payload
      )
    `)
    .eq("task_id", task.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = submissions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <Link href={`/work/${task.slug}`}>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {task.title}</span>
          </Button>
        </Link>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {task.category}
        </span>
      </div>

      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Submission History
        </h1>
        <p className="text-xs text-muted-foreground">
          Review quality scores, reviewer feedback notes, and earnings for past evaluated items.
        </p>
      </div>

      {list.length > 0 ? (
        <div className="space-y-4">
          {list.map((sub: any) => {
            const item = sub.work_items;
            const mins = sub.seconds_spent ? Math.round(sub.seconds_spent / 60) : 0;

            return (
              <div
                key={sub.id}
                className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    {sub.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approved
                      </span>
                    ) : sub.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Not Accepted
                      </span>
                    ) : sub.status === "revision_requested" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                        <Hourglass className="h-3.5 w-3.5" />
                        Revision Requested
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        <Hourglass className="h-3.5 w-3.5" />
                        Submitted for Review
                      </span>
                    )}

                    <span className="text-xs font-mono text-muted-foreground">
                      ID: {sub.id.slice(0, 8)}
                    </span>
                    {item?.external_ref && (
                      <span className="text-xs text-muted-foreground">
                        • Ref: {item.external_ref}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {mins > 0 && <span>Spent {mins}m</span>}
                    <span>Submitted {formatDate(sub.created_at)}</span>
                    {sub.earning_cents != null && (
                      <span className="font-heading font-extrabold text-sm text-[#0F766E]">
                        +{formatCents(sub.earning_cents)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Reviewer Note */}
                {(sub.score != null || sub.reviewer_note) && (
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-1.5">
                    {sub.score != null && (
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="text-muted-foreground">Quality Score:</span>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < sub.score ? "fill-amber-400 text-amber-400" : "text-muted/60"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          ({sub.score} / 5)
                        </span>
                      </div>
                    )}

                    {sub.reviewer_note && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">
                          Reviewer Feedback
                        </span>
                        <p className="italic text-foreground/90 leading-relaxed">
                          &ldquo;{sub.reviewer_note}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Answers Summary */}
                <details className="text-xs group">
                  <summary className="font-semibold text-primary hover:underline cursor-pointer select-none">
                    Inspect submitted answers
                  </summary>
                  <div className="mt-2 p-3.5 rounded-xl bg-muted/30 border border-border/60 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(sub.answers, null, 2)}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-card rounded-[14px] border border-dashed border-border space-y-2">
          <p className="font-heading font-bold text-sm text-foreground">No Submissions Yet</p>
          <p className="text-xs text-muted-foreground">
            You haven&apos;t evaluated any items for this task yet.
          </p>
          <div className="pt-2">
            <Link href={`/work/${task.slug}`}>
              <Button size="sm" className="rounded-full text-xs font-bold px-5">
                Start Working
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
