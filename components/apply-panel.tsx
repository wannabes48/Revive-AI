"use client";

import * as React from "react";
import Link from "next/link";
import { Application, Task } from "@/lib/supabase/types";
import { applyToTaskAction, withdrawApplicationAction } from "@/actions/applications";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Hourglass,
  Loader2,
  Lock,
  LogOut,
  Send,
  ShieldCheck,
  Undo2,
} from "lucide-react";

interface ApplyPanelProps {
  task: Task;
  user: { id: string; email?: string } | null;
  existingApplication: Application | null;
  canApply?: boolean;
  completenessScore?: number;
}

export function ApplyPanel({
  task,
  user,
  existingApplication,
  canApply = true,
  completenessScore,
}: ApplyPanelProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // State 4: Task is closed
  if (task.status === "closed") {
    return (
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Application Status
          </span>
          <StatusBadge status="closed" />
        </div>
        <div className="p-4 rounded-xl bg-muted/60 border border-border/80 text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">Cohort Review Closed</p>
          <p className="text-xs text-muted-foreground">
            This task is currently not accepting new applicants.
          </p>
        </div>
        <Button disabled className="w-full rounded-full opacity-60">
          Applications Closed
        </Button>
      </div>
    );
  }

  // State 1: User is not logged in
  if (!user) {
    return (
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold text-foreground">
            Apply for this Task
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Join the waitlist to be reviewed by the domain lead. You must have an expert account to apply.
          </p>
        </div>

        <Link href={`/login?redirectTo=/tasks/${task.slug}`} className="block">
          <Button className="w-full rounded-full font-semibold shadow-xs gap-2">
            <Lock className="h-4 w-4" />
            <span>Log in to apply</span>
          </Button>
        </Link>

        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    );
  }

  // State 3: User has already applied (and application is not withdrawn, or is withdrawn)
  if (existingApplication && existingApplication.status !== "withdrawn") {
    return (
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Application
          </span>
          <StatusBadge status={existingApplication.status} />
        </div>

        <div className="space-y-3">
          {existingApplication.status === "waitlisted" && (
            <div className="p-4 rounded-xl bg-[#FEF3C7]/40 border border-[#FDE68A] flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#FEF3C7] text-[#78350F] flex items-center justify-center shrink-0">
                <Hourglass className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#78350F]">
                  Waitlist Position: #{existingApplication.position || 1}
                </p>
                <p className="text-[11px] text-[#78350F]/90 font-medium">
                  You are queued for evaluation by our administrative review team.
                </p>
              </div>
            </div>
          )}

          {existingApplication.status === "approved" && (
            <div className="p-4 rounded-xl bg-[#CCFBF1]/40 border border-[#99F6E4] flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F766E]">
                  Application Approved
                </p>
                <p className="text-[11px] text-[#0F766E]/80">
                  You have been cleared to participate in this benchmark cohort.
                </p>
              </div>
            </div>
          )}

          {existingApplication.status === "rejected" && (
            <div className="p-4 rounded-xl bg-[#FEE2E2]/40 border border-[#FECACA] flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#B91C1C]">Not Selected</p>
                <p className="text-[11px] text-[#B91C1C]/80">
                  This batch reached capacity or required alternate specialization.
                </p>
              </div>
            </div>
          )}

          {existingApplication.note && (
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Submitted Brief
              </span>
              <p className="text-xs text-foreground bg-muted/40 p-3 rounded-lg border border-border/60 italic leading-relaxed">
                &ldquo;{existingApplication.note}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Withdraw Action */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={async () => {
              if (confirm("Are you sure you want to withdraw your application?")) {
                setLoading(true);
                const res = await withdrawApplicationAction(existingApplication.id, task.slug);
                if (res.error) {
                  toast.error(res.error);
                } else {
                  toast.info("Application withdrawn.");
                }
                setLoading(false);
              }
            }}
            className="w-full rounded-full text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Undo2 className="h-3.5 w-3.5" />
            )}
            <span>Withdraw Application</span>
          </Button>
        </div>
      </div>
    );
  }

  // State 2: User is logged in but profile completeness is below apply threshold
  if (canApply === false) {
    return (
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold text-foreground">
            Apply for this Task
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submit your qualification brief to join this task&apos;s priority review waitlist.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#78350F]">
            <AlertCircle className="h-4 w-4 text-[#B45309] shrink-0" />
            <span>Complete your profile to apply.</span>
          </div>
          <p className="text-[11px] text-[#78350F] leading-relaxed">
            Your profile completeness is {completenessScore ?? 0}%. You must reach at least 50% to submit task applications.
          </p>
          <div className="pt-1">
            <Link href="/profile">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs font-semibold rounded-full border-[#B45309]/30 text-[#78350F] hover:bg-[#FEF3C7]"
              >
                Complete Profile →
              </Button>
            </Link>
          </div>
        </div>

        <Button disabled className="w-full rounded-full font-semibold opacity-60 cursor-not-allowed">
          Apply (Profile Incomplete)
        </Button>
      </div>
    );
  }

  // State 2: Logged in and not applied (or previously withdrawn)
  async function handleApplySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("taskId", task.id);
    formData.set("taskSlug", task.slug);

    const result = await applyToTaskAction(formData);

    if (result.error) {
      setErrorMessage(result.error);
      toast.error(result.error);
    } else {
      setSuccessMessage(result.message || "Application successfully queued!");
      toast.success("You're on the waitlist!", {
        description: "Your application brief has been received and queued.",
      });
      setTimeout(() => {
        setDialogOpen(false);
      }, 1400);
    }
    setLoading(false);
  }

  return (
    <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-bold text-foreground">
          Ready to Contribute?
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Submit your qualification brief to join this task&apos;s priority review waitlist.
        </p>
      </div>

      <Button
        onClick={() => setDialogOpen(true)}
        className="w-full rounded-full font-semibold shadow-xs gap-2 h-11 min-h-[44px] touch-target"
      >
        <span>Apply for this Task</span>
        <ArrowRight className="h-4 w-4" />
      </Button>

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`Apply to ${task.title}`}
        description="Provide a concise overview of your domain background, degrees, or publications relevant to this benchmark."
        footer={
          !successMessage ? (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="rounded-full text-xs h-10 touch-target"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="apply-task-form"
                disabled={loading}
                className="rounded-full text-xs font-semibold px-5 shadow-xs gap-1.5 h-10 touch-target"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Application</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="rounded-full text-xs h-10 touch-target w-full sm:w-auto"
            >
              Done
            </Button>
          )
        }
      >
        {successMessage ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="font-heading font-bold text-base text-foreground">
              Application Received
            </h4>
            <p className="text-xs text-muted-foreground">{successMessage}</p>
          </div>
        ) : (
          <form id="apply-task-form" onSubmit={handleApplySubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note" className="text-xs font-semibold text-foreground">
                Qualification Note / Experience Brief *
              </Label>
              <Textarea
                id="note"
                name="note"
                required
                rows={4}
                placeholder="e.g. Board-certified radiologist with 8 years reading trauma CTs at Mass General. Published 4 papers on machine perception in medical imaging..."
                className="rounded-lg border-border focus-visible:ring-primary/20 focus-visible:border-primary text-base sm:text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Minimum 10 characters. Include degrees, board licenses, or repositories.
              </p>
            </div>
          </form>
        )}
      </ResponsiveDialog>

      <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center gap-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>Waitlist placement is timestamped upon submission.</span>
      </div>
    </div>
  );
}
