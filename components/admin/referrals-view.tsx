"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import {
  REFERRAL_FLAG_LABELS,
  formatUsd,
  type ReferralSettings,
  type ReferralStatus,
} from "@/lib/referrals";
import {
  adminGetReferralDetails,
  adminReviewReferral,
  adminSetReferralEnabled,
  adminUpdateReferralSettings,
  type ReferralAccountDetails,
} from "@/actions/admin-referrals";
import { AlertTriangle, Check, Eye, Loader2, Power, X } from "lucide-react";

export interface AdminReferralRow {
  id: string;
  referrerId: string;
  referredId: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
  status: ReferralStatus;
  flagReason: string | null;
  reviewNote: string | null;
  createdAt: string;
  earnedCents: number;
}

export interface TopReferrer {
  id: string;
  name: string;
  email: string;
  invited: number;
  rewarded: number;
}

const TABS: { id: ReferralStatus; label: string }[] = [
  { id: "qualified", label: "Needs review" },
  { id: "pending", label: "Pending" },
  { id: "rewarded", label: "Rewarded" },
  { id: "rejected", label: "Rejected" },
];

interface Props {
  rows: AdminReferralRow[];
  stats: { label: string; value: string }[];
  topReferrers: TopReferrer[];
  settings: ReferralSettings;
}

export function AdminReferralsView({ rows, stats, topReferrers, settings }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<ReferralStatus>("qualified");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<AdminReferralRow | null>(null);
  const [rejectNote, setRejectNote] = React.useState("");
  const [inspecting, setInspecting] = React.useState<AdminReferralRow | null>(null);
  const [details, setDetails] = React.useState<{
    referrer?: ReferralAccountDetails;
    referred?: ReferralAccountDetails;
    error?: string;
  } | null>(null);

  const visible = rows.filter((r) => r.status === tab);
  const goal = settings.min_earned_cents;

  const approve = async (row: AdminReferralRow) => {
    setBusyId(row.id);
    const res = await adminReviewReferral(row.id, true);
    setBusyId(null);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.message || "Approved.");
      router.refresh();
    }
  };

  const submitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    setBusyId(rejecting.id);
    const res = await adminReviewReferral(rejecting.id, false, rejectNote);
    setBusyId(null);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.message || "Rejected.");
      setRejecting(null);
      setRejectNote("");
      router.refresh();
    }
  };

  const inspect = async (row: AdminReferralRow) => {
    setInspecting(row);
    setDetails(null);
    setDetails(await adminGetReferralDetails(row.referrerId, row.referredId));
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-2xl border border-border bg-card shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {s.label}
            </span>
            <span className="text-2xl font-heading font-black text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const count = rows.filter((r) => r.status === t.id).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 cursor-pointer ${
                    tab === t.id
                      ? "bg-[#0F766E] text-white"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {visible.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((r) => {
                  const canReview = r.status === "pending" || r.status === "qualified";
                  return (
                    <li key={r.id} className="p-4 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="text-xs space-y-1 min-w-0">
                          <p className="text-foreground truncate">
                            <span className="text-muted-foreground">Referrer:</span>{" "}
                            <strong>{r.referrerName}</strong>{" "}
                            <span className="text-muted-foreground">{r.referrerEmail}</span>
                          </p>
                          <p className="text-foreground truncate">
                            <span className="text-muted-foreground">Referred:</span>{" "}
                            <strong>{r.referredName}</strong>{" "}
                            <span className="text-muted-foreground">{r.referredEmail}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Signed up {formatDate(r.createdAt)} · earned{" "}
                            <strong className="text-foreground">{formatUsd(r.earnedCents)}</strong> of{" "}
                            {formatUsd(goal)}
                          </p>
                          {r.flagReason && (
                            <p className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {REFERRAL_FLAG_LABELS[r.flagReason] || r.flagReason}
                            </p>
                          )}
                          {r.reviewNote && (
                            <p className="text-muted-foreground">Note: {r.reviewNote}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => inspect(r)}
                            className="h-8 px-2 text-xs gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Button>
                          {canReview && (
                            <>
                              <Button
                                size="sm"
                                disabled={busyId === r.id}
                                onClick={() => approve(r)}
                                title={r.status === "pending" ? "Admin override: pay before the goal is reached" : undefined}
                                className="h-8 text-xs font-bold bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1"
                              >
                                {busyId === r.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                {r.status === "pending" ? "Approve early" : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === r.id}
                                onClick={() => {
                                  setRejectNote("");
                                  setRejecting(r);
                                }}
                                className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: settings + top referrers */}
        <div className="space-y-6">
          <SettingsCard settings={settings} />

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Top referrers
            </h3>
            {topReferrers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No referrals yet.</p>
            ) : (
              <ul className="space-y-2">
                {topReferrers.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground truncate">{t.name}</span>
                      <span className="block text-muted-foreground truncate">{t.invited} invited</span>
                    </span>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        t.rewarded >= settings.max_rewards_per_referrer ? "text-rose-600" : "text-foreground"
                      }`}
                    >
                      {t.rewarded}/{settings.max_rewards_per_referrer}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground">
              To claw back a reward after fraud, add a negative adjustment with a note on the Ledger &amp;
              Finance page. The ledger stays append-only.
            </p>
          </div>
        </div>
      </div>

      {/* Reject dialog */}
      <ResponsiveDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
        title="Reject referral"
        description={rejecting ? `${rejecting.referrerName} → ${rejecting.referredName}` : undefined}
      >
        <form onSubmit={submitReject} className="space-y-3 pt-1">
          <Label htmlFor="reject-note" className="text-xs font-semibold">
            Reason (required, saved to the audit trail)
          </Label>
          <Textarea
            id="reject-note"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            maxLength={500}
            className="text-xs"
            placeholder="e.g. Same person operating both accounts"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!rejectNote.trim() || busyId === rejecting?.id}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Reject referral
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* Details side panel */}
      <ResponsiveDialog
        open={Boolean(inspecting)}
        onOpenChange={(open) => !open && setInspecting(null)}
        title="Referral accounts"
        description={
          inspecting?.flagReason
            ? `Flagged: ${REFERRAL_FLAG_LABELS[inspecting.flagReason] || inspecting.flagReason}`
            : "Compare both accounts before deciding."
        }
      >
        {!details ? (
          <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : details.error ? (
          <p className="p-4 text-xs text-rose-600">{details.error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto text-xs">
            {(["referrer", "referred"] as const).map((role) => {
              const a = details[role]!;
              return (
                <div key={role} className="p-3 rounded-xl border border-border space-y-2">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{role}</span>
                  <p className="font-semibold text-foreground">{a.name}</p>
                  <p className="text-muted-foreground break-all">{a.email}</p>
                  <p className="text-muted-foreground">Account created {formatDate(a.createdAt)}</p>
                  {a.payoutsBlocked && <p className="font-semibold text-rose-600">Payouts blocked</p>}
                  <div>
                    <span className="font-semibold text-foreground">Payout methods</span>
                    {a.payoutMethods.length === 0 ? (
                      <p className="text-muted-foreground">None</p>
                    ) : (
                      <ul className="text-muted-foreground">
                        {a.payoutMethods.map((m, i) => (
                          <li key={i}>
                            {m.type.toUpperCase()}: {m.masked} ({formatDate(m.createdAt)})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Recent submissions</span>
                    {a.recentSubmissions.length === 0 ? (
                      <p className="text-muted-foreground">None</p>
                    ) : (
                      <ul className="text-muted-foreground">
                        {a.recentSubmissions.map((s, i) => (
                          <li key={i}>
                            {formatDate(s.createdAt)} · {s.status}
                            {s.earningCents ? ` · ${formatUsd(s.earningCents)}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}

function SettingsCard({ settings }: { settings: ReferralSettings }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    referrer_reward_dollars: String(settings.referrer_reward_cents / 100),
    referred_reward_dollars: String(settings.referred_reward_cents / 100),
    min_earned_dollars: String(settings.min_earned_cents / 100),
    window_days: String(settings.window_days),
    hold_days: String(settings.hold_days),
    max_rewards_per_referrer: String(settings.max_rewards_per_referrer),
    auto_approve: settings.auto_approve,
  });
  const [saving, setSaving] = React.useState(false);
  const [confirmToggle, setConfirmToggle] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  const fields: { key: keyof typeof form; label: string; prefix?: string; suffix?: string }[] = [
    { key: "referrer_reward_dollars", label: "Referrer reward", prefix: "$" },
    { key: "referred_reward_dollars", label: "Welcome bonus", prefix: "$" },
    { key: "min_earned_dollars", label: "Qualification amount", prefix: "$" },
    { key: "window_days", label: "Window", suffix: "days" },
    { key: "hold_days", label: "Hold", suffix: "days" },
    { key: "max_rewards_per_referrer", label: "Cap per referrer" },
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await adminUpdateReferralSettings({
      enabled: settings.enabled,
      referrer_reward_dollars: Number(form.referrer_reward_dollars),
      referred_reward_dollars: Number(form.referred_reward_dollars),
      min_earned_dollars: Number(form.min_earned_dollars),
      window_days: Number(form.window_days),
      hold_days: Number(form.hold_days),
      max_rewards_per_referrer: Number(form.max_rewards_per_referrer),
      auto_approve: form.auto_approve,
    });
    setSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.message || "Saved.");
      router.refresh();
    }
  };

  const toggle = async () => {
    setToggling(true);
    const res = await adminSetReferralEnabled(!settings.enabled);
    setToggling(false);
    setConfirmToggle(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.message || "Updated.");
      router.refresh();
    }
  };

  const worstCasePerReferral = settings.referrer_reward_cents + settings.referred_reward_cents;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Program</h3>
          <p
            className={`text-sm font-bold ${
              settings.enabled ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {settings.enabled ? "Live" : "Paused"}
          </p>
        </div>
        <Button
          size="sm"
          variant={settings.enabled ? "outline" : "default"}
          onClick={() => setConfirmToggle(true)}
          className="h-8 text-xs font-bold gap-1.5"
        >
          <Power className="h-3.5 w-3.5" />
          {settings.enabled ? "Pause" : "Go live"}
        </Button>
      </div>

      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`ref-${f.key}`} className="text-[11px] font-semibold">
                {f.label}
                {f.suffix ? ` (${f.suffix})` : ""}
              </Label>
              <div className="relative">
                {f.prefix && (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {f.prefix}
                  </span>
                )}
                <Input
                  id={`ref-${f.key}`}
                  type="number"
                  min={0}
                  step={f.prefix ? "0.01" : "1"}
                  value={form[f.key] as string}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={`h-9 text-xs ${f.prefix ? "pl-6" : ""}`}
                  required
                />
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={form.auto_approve}
            onChange={(e) => setForm({ ...form, auto_approve: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[#0F766E]"
          />
          <span>
            <span className="font-semibold text-foreground">Auto-approve clean referrals</span>
            <span className="block text-[11px] text-muted-foreground">
              Off sends every qualified referral to Needs review.
            </span>
          </span>
        </label>
        <Button type="submit" size="sm" disabled={saving} className="w-full h-9 text-xs font-bold gap-1.5">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save settings
        </Button>
      </form>

      <ResponsiveDialog
        open={confirmToggle}
        onOpenChange={setConfirmToggle}
        title={settings.enabled ? "Pause the referral program?" : "Turn the referral program on?"}
        description={
          settings.enabled
            ? "Contributors' links are hidden and new earnings stop qualifying referrals. Existing rewards are unaffected."
            : "Contributors with at least 50% profile completeness get a referral link, and qualifying referrals start paying."
        }
      >
        <div className="space-y-3 pt-1 text-xs">
          {!settings.enabled && (
            <p className="p-3 rounded-lg bg-muted/50 border border-border text-muted-foreground">
              Worst-case spend per referrer: {settings.max_rewards_per_referrer} ×{" "}
              {formatUsd(worstCasePerReferral)} ={" "}
              <strong className="text-foreground">
                {formatUsd(settings.max_rewards_per_referrer * worstCasePerReferral)}
              </strong>
              . Multiply by your number of active referrers to size the budget.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmToggle(false)} className="gap-1">
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" disabled={toggling} onClick={toggle} className="gap-1.5 font-bold">
              {toggling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {settings.enabled ? "Pause program" : "Go live"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
