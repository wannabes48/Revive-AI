"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ItemBatch, Task, WorkItem } from "@/lib/supabase/types";
import { publishBatch, reshuffleBatch, deleteBatch } from "@/actions/admin-work";
import { formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  Layers,
  Loader2,
  PauseCircle,
  Rocket,
  Shuffle,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";

interface BatchesPanelProps {
  task: Task;
  batches: ItemBatch[];
  items: WorkItem[];
  approvedContributors: number;
}

type DialogState =
  | { kind: "publish"; batch: ItemBatch; schedule: boolean }
  | { kind: "preview"; batch: ItemBatch }
  | null;

export function BatchesPanel({ task, batches, items, approvedContributors }: BatchesPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [publishAt, setPublishAt] = React.useState("");
  const [renderedAt] = React.useState(() => Date.now());

  const countsByBatch = React.useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const item of items) {
      if (!item.batch_id) continue;
      const c = map.get(item.batch_id) || { available: 0, claimed: 0, submitted: 0, completed: 0, total: 0 };
      c[item.status] = (c[item.status] || 0) + 1;
      c.total++;
      map.set(item.batch_id, c);
    }
    return map;
  }, [items]);

  const hasForm = Array.isArray(task.item_schema) && task.item_schema.length > 0;
  const hasRate = (task.rate_cents || 0) > 0;
  const isOpen = task.status === "open";
  const anyPublished = batches.some((b) => b.status === "published");

  async function run(id: string, fn: () => Promise<{ error?: string; success?: boolean }>, ok: string) {
    setBusy(id);
    const res = await fn();
    setBusy(null);
    if (res.error) {
      toast.error(res.error);
      return false;
    }
    toast.success(ok);
    router.refresh();
    return true;
  }

  async function confirmPublish() {
    if (dialog?.kind !== "publish") return;
    const { batch, schedule } = dialog;
    if (schedule && !publishAt) {
      toast.error("Choose a release time.");
      return;
    }
    const ok = await run(
      batch.id,
      () => publishBatch(batch.id, task.id, "published", schedule ? new Date(publishAt).toISOString() : null),
      schedule ? `"${batch.name}" scheduled` : `"${batch.name}" is live`
    );
    if (ok) {
      setDialog(null);
      setPublishAt("");
    }
  }

  const previewItems =
    dialog?.kind === "preview" ? items.filter((i) => i.batch_id === dialog.batch.id).slice(0, 5) : [];

  return (
    <section className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/60">
        <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#0F766E]" />
          Batches
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Imports arrive as drafts. Contributors only receive items from published batches, each in a random order.
        </p>
      </div>

      {anyPublished && !isOpen && (
        <div className="m-4 mb-0 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          A batch is published but this task is <strong>{task.status}</strong>, so contributors can&apos;t work on
          it. Open the task to release the work.
        </div>
      )}

      {/* Pre-publish check */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {[
          { ok: hasForm, label: "Answer form set" },
          { ok: hasRate, label: task.pay_model === "hourly" ? "Hourly rate set" : "Pay per item set" },
          { ok: isOpen, label: "Task is open" },
        ].map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-2 p-2.5 rounded-lg border ${
              c.ok ? "border-[#0F766E]/25 bg-[#0F766E]/5" : "border-destructive/25 bg-destructive/5"
            }`}
          >
            {c.ok ? (
              <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <span className="font-semibold text-foreground">{c.label}</span>
          </div>
        ))}
      </div>

      {batches.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-muted-foreground">No batches yet. Import items to create one.</p>
      ) : (
        <div className="divide-y divide-border/60 border-t border-border/60">
          {batches.map((b) => {
            const c = countsByBatch.get(b.id) || { available: 0, claimed: 0, submitted: 0, completed: 0, total: 0 };
            const scheduled =
              b.status === "published" && b.publish_at && new Date(b.publish_at).getTime() > renderedAt;
            const canPublish = hasForm && hasRate && c.total > 0;
            const isBusy = busy === b.id;
            return (
              <div key={b.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{b.name}</span>
                    <StatusChip status={b.status} scheduled={Boolean(scheduled)} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.total} items · {c.available || 0} available · {c.claimed || 0} claimed ·{" "}
                    {c.submitted || 0} in review · {c.completed || 0} completed
                  </div>
                  {scheduled && (
                    <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" /> Releases {formatDateTime(b.publish_at!)}
                    </div>
                  )}
                  {b.status === "paused" && (
                    <div className="text-[11px] text-muted-foreground">
                      No new claims. Items already held can still be submitted.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDialog({ kind: "preview", batch: b })}
                    className="h-8 rounded-full text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>

                  {b.status !== "published" && (
                    <>
                      <Button
                        size="sm"
                        disabled={!canPublish || isBusy}
                        title={canPublish ? undefined : "Needs items, an answer form and a pay rate"}
                        onClick={() => setDialog({ kind: "publish", batch: b, schedule: false })}
                        className="h-8 rounded-full text-xs font-bold gap-1 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                      >
                        <Rocket className="h-3.5 w-3.5" /> {b.status === "paused" ? "Resume" : "Publish now"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canPublish || isBusy}
                        onClick={() => setDialog({ kind: "publish", batch: b, schedule: true })}
                        className="h-8 rounded-full text-xs gap-1"
                      >
                        <CalendarClock className="h-3.5 w-3.5" /> Schedule
                      </Button>
                    </>
                  )}

                  {b.status === "published" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => run(b.id, () => publishBatch(b.id, task.id, "paused"), `"${b.name}" paused`)}
                      className="h-8 rounded-full text-xs gap-1 text-[#B45309] border-[#FDE68A] hover:bg-[#FEF3C7]"
                    >
                      <PauseCircle className="h-3.5 w-3.5" /> Pause
                    </Button>
                  )}

                  {b.status !== "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => {
                        if (!confirm(`Unpublish "${b.name}" back to draft? Contributors stop receiving its items.`)) return;
                        void run(b.id, () => publishBatch(b.id, task.id, "draft"), `"${b.name}" moved to draft`);
                      }}
                      className="h-8 rounded-full text-xs gap-1"
                    >
                      <Undo2 className="h-3.5 w-3.5" /> Unpublish
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy || !c.available}
                    onClick={() => run(b.id, () => reshuffleBatch(b.id, task.id), "Order reshuffled for future claims")}
                    className="h-8 rounded-full text-xs gap-1"
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                    Reshuffle
                  </Button>

                  {b.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => {
                        if (!confirm(`Delete the draft batch "${b.name}" and its ${c.total} items?`)) return;
                        void run(b.id, () => deleteBatch(b.id, task.id), "Batch deleted");
                      }}
                      className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete draft batch"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Publish / schedule dialog */}
      <ResponsiveDialog
        open={dialog?.kind === "publish"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "publish" ? (dialog.schedule ? `Schedule "${dialog.batch.name}"` : `Publish "${dialog.batch.name}"`) : ""}
        description="Published items are handed out to approved contributors in a random order."
      >
        {dialog?.kind === "publish" && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <p>
                <strong>{countsByBatch.get(dialog.batch.id)?.available || 0}</strong> items will go live
                {dialog.schedule ? " at the release time" : " now"}.
              </p>
              <p>
                {dialog.batch.published_at
                  ? "Contributors were already notified when this batch was first published."
                  : `${approvedContributors} approved contributor${approvedContributors === 1 ? "" : "s"} will be notified.`}
              </p>
              {!isOpen && (
                <p className="text-destructive font-semibold">
                  The task is not open, so nobody can claim these items until you open it.
                </p>
              )}
            </div>
            {dialog.schedule && (
              <div className="space-y-1">
                <Label htmlFor="publish_at" className="text-xs font-semibold">
                  Release time (your local time)
                </Label>
                <Input
                  id="publish_at"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="h-10 text-xs rounded-lg"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)} className="rounded-full text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={busy === dialog.batch.id}
                onClick={confirmPublish}
                className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
              >
                {busy === dialog.batch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {dialog.schedule ? "Schedule release" : "Publish now"}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* Preview dialog */}
      <ResponsiveDialog
        open={dialog?.kind === "preview"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "preview" ? `Preview: ${dialog.batch.name}` : ""}
        description="The first five items, as a contributor sees them."
        className="sm:max-w-2xl! md:max-w-3xl!"
      >
        <div className="space-y-4 pt-2">
          {previewItems.length === 0 && <p className="text-sm text-muted-foreground">This batch has no items.</p>}
          {previewItems.map((item, i) => (
            <div key={item.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Item {i + 1} {item.external_ref ? `· Ref ${item.external_ref}` : ""}
              </div>
              {Object.entries(item.payload || {}).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                    {key.replace(/_/g, " ")}
                  </span>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs text-foreground whitespace-pre-wrap break-words">
                    {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ResponsiveDialog>
    </section>
  );
}

function StatusChip({ status, scheduled }: { status: ItemBatch["status"]; scheduled: boolean }) {
  const styles =
    status === "published"
      ? scheduled
        ? "bg-primary/10 text-primary"
        : "bg-[#E5EFEC] text-[#0F766E]"
      : status === "paused"
      ? "bg-[#FEF3C7] text-[#B45309]"
      : "bg-muted text-muted-foreground";
  const label = status === "published" ? (scheduled ? "Scheduled" : "Published") : status === "paused" ? "Paused" : "Draft";
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${styles}`}>{label}</span>;
}
