"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { adminSetKycStatus, type AdminKycDecision } from "@/actions/admin-kyc";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  FileWarning,
  Loader2,
  Lock,
} from "lucide-react";

export interface KycControlTarget {
  userId: string;
  name: string;
  email?: string | null;
  kycStatus?: string | null;
  kycLocked?: boolean | null;
  /** kyc_verifications row to update; omitted/derived rows create a new audit record. */
  verificationId?: string | null;
}

const DECISIONS: {
  id: AdminKycDecision;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  requiresNote: boolean;
}[] = [
  {
    id: "verified",
    label: "Approve identity",
    description: "Mark KYC verified and unlock Payments & Tax setup.",
    icon: CheckCircle2,
    tone: "text-emerald-700 dark:text-emerald-400",
    requiresNote: false,
  },
  {
    id: "rejected",
    label: "Decline",
    description: "Mark KYC declined. The contributor can retry.",
    icon: XCircle,
    tone: "text-rose-700 dark:text-rose-400",
    requiresNote: true,
  },
  {
    id: "resubmission_requested",
    label: "Request resubmission",
    description: "Ask for new documents and reopen verification.",
    icon: FileWarning,
    tone: "text-amber-700 dark:text-amber-400",
    requiresNote: true,
  },
  {
    id: "pending",
    label: "Move to manual review",
    description: "Hold as pending while compliance investigates. No email sent.",
    icon: Clock,
    tone: "text-blue-700 dark:text-blue-400",
    requiresNote: false,
  },
  {
    id: "unverified",
    label: "Reset verification",
    description: "Clear the session so the contributor starts over.",
    icon: RotateCcw,
    tone: "text-muted-foreground",
    requiresNote: false,
  },
];

const STATUS_LABELS: Record<string, string> = {
  verified: "Verified",
  approved: "Verified",
  pending: "Pending review",
  in_review: "Pending review",
  in_progress: "In progress",
  rejected: "Declined",
  declined: "Declined",
  expired: "Expired",
  abandoned: "Abandoned",
  unverified: "Not started",
  not_started: "Not started",
  resubmitted: "Resubmission requested",
};

interface KycControlDialogProps {
  target: KycControlTarget | null;
  onClose: () => void;
  onDone?: () => void;
  /** Preselect a decision (e.g. from a quick "Reject" button). */
  initialDecision?: AdminKycDecision;
}

export function KycControlDialog(props: KycControlDialogProps) {
  if (!props.target) return null;
  // Keyed so the form state resets whenever a different contributor/decision is opened.
  return (
    <KycControlDialogInner
      key={`${props.target.userId}:${props.target.verificationId ?? ""}:${props.initialDecision ?? ""}`}
      {...props}
      target={props.target}
    />
  );
}

function KycControlDialogInner({
  target,
  onClose,
  onDone,
  initialDecision,
}: KycControlDialogProps & { target: KycControlTarget }) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<AdminKycDecision>(
    initialDecision || (target.kycStatus === "verified" ? "rejected" : "verified")
  );
  const [note, setNote] = React.useState("");
  const [notifyUser, setNotifyUser] = React.useState(true);
  const [lock, setLock] = React.useState(Boolean(target.kycLocked));
  const [submitting, setSubmitting] = React.useState(false);

  const selected = DECISIONS.find((d) => d.id === decision)!;
  const noteMissing = selected.requiresNote && !note.trim();
  const currentStatus = target.kycStatus || "unverified";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || noteMissing) return;
    setSubmitting(true);
    const res = await adminSetKycStatus({
      userId: target.userId,
      verificationId: target.verificationId,
      decision,
      note,
      notifyUser,
      lock,
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message || "KYC updated.");
    onDone?.();
    onClose();
    router.refresh();
  };

  return (
    <ResponsiveDialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && !submitting && onClose()}
      title="Manual KYC control"
      description={
        target ? (
          <span>
            {target.name}
            {target.email ? <span className="text-muted-foreground"> · {target.email}</span> : null}
          </span>
        ) : undefined
      }
    >
      {target && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current status
            </span>
            <span className="font-semibold text-foreground">
              {STATUS_LABELS[currentStatus] || currentStatus}
            </span>
            {target.kycLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20">
                <Lock className="h-3 w-3" />
                Locked by admin
              </span>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Decision
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DECISIONS.map((d) => {
                const Icon = d.icon;
                const active = decision === d.id;
                return (
                  <label
                    key={d.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      active
                        ? "border-[#0F766E] bg-[#0F766E]/5 ring-1 ring-[#0F766E]/30"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kyc-decision"
                      value={d.id}
                      checked={active}
                      onChange={() => setDecision(d.id)}
                      className="sr-only"
                    />
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${d.tone}`} />
                    <span>
                      <span className="block font-semibold text-foreground">{d.label}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {d.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="kyc-note" className="text-xs font-semibold">
              {selected.requiresNote ? "Reason (required)" : "Note (optional)"}
            </Label>
            <Textarea
              id="kyc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                selected.requiresNote
                  ? "e.g. The ID photo is blurry — please upload a clear photo of all four corners."
                  : "Internal audit note"
              }
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              {selected.requiresNote
                ? "Shown to the contributor in their email and notification."
                : "Saved to the KYC audit trail."}
            </p>
          </div>

          <div className="space-y-2 p-3 rounded-xl border border-border">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyUser}
                onChange={(e) => setNotifyUser(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#0F766E]"
              />
              <span>
                <span className="block font-semibold text-foreground">Notify contributor</span>
                <span className="block text-[11px] text-muted-foreground">
                  Sends an in-app notification and email.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lock}
                onChange={(e) => setLock(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#0F766E]"
              />
              <span>
                <span className="block font-semibold text-foreground">Lock this decision</span>
                <span className="block text-[11px] text-muted-foreground">
                  Future Didit webhooks are logged but won&apos;t change this contributor&apos;s KYC status.
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || noteMissing}
              className="rounded-lg text-xs font-bold bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply decision
            </Button>
          </div>
        </form>
      )}
    </ResponsiveDialog>
  );
}
