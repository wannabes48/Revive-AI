"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminGetPayoutPreview,
  adminRecordPayout,
  type PayoutPreviewEntry,
} from "@/actions/admin-work";
import { formatCents, formatDate, maskDetails } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Banknote, Loader2, Search, ShieldAlert, Send } from "lucide-react";

export interface AwaitingBalanceRow {
  userId: string;
  name: string;
  email: string;
  payoutsBlocked: boolean;
  awaitingCents: number;
  availableCents: number;
  pendingCents: number;
  lifetimePaidCents: number;
  lastPayoutAt: string | null;
  methodType: string | null;
}

const KIND_LABELS: Record<string, string> = {
  earning: "Earning",
  bonus: "Bonus",
  adjustment: "Adjustment",
  payout_reversal: "Returned payout",
};

export function ReleaseFunds({
  rows,
  migrationMissing,
}: {
  rows: AwaitingBalanceRow[];
  migrationMissing: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<AwaitingBalanceRow | null>(null);

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });
  const total = rows.reduce((s, r) => s + r.awaitingCents, 0);

  return (
    <section className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-4 w-4 text-[#0F766E]" />
            Release funds
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} contributor{rows.length === 1 ? "" : "s"} awaiting payout ·{" "}
            <span className="font-semibold text-foreground">{formatCents(total)}</span> in total. Send the
            money through Wise or Payoneer, then mark it as paid here — the contributor gets an email with
            the earnings it covers.
          </p>
        </div>
        <div className="relative sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="h-9 pl-8 text-xs rounded-full"
          />
        </div>
      </div>

      {migrationMissing ? (
        <div className="p-5 text-sm text-amber-800 dark:text-amber-300 bg-amber-500/10">
          Apply <code className="font-mono">supabase/012_hourly_auto_approve_and_manual_payouts.sql</code> to
          enable manual payouts.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No contributor has funds awaiting payout." : "No contributors match your search."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Contributor</th>
                <th className="text-right font-semibold px-4 py-2.5">Awaiting payout</th>
                <th className="text-right font-semibold px-4 py-2.5 hidden md:table-cell">Paid to date</th>
                <th className="text-left font-semibold px-4 py-2.5 hidden md:table-cell">Last payout</th>
                <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">Method</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((r) => (
                <tr key={r.userId} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${r.userId}`} className="font-semibold text-foreground hover:text-primary">
                      {r.name}
                    </Link>
                    <span className="block text-[11px] text-muted-foreground">{r.email}</span>
                    {r.payoutsBlocked && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Payouts blocked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-bold text-sm text-[#0F766E]">{formatCents(r.awaitingCents)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono hidden md:table-cell">
                    {formatCents(r.lifetimePaidCents)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {r.lastPayoutAt ? formatDate(r.lastPayoutAt) : "Never"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell uppercase text-[11px] font-semibold">
                    {r.methodType || <span className="normal-case font-normal text-amber-700">None added</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => setSelected(r)}
                      className="rounded-full text-xs font-bold h-8 px-3.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    >
                      Mark as paid
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ResponsiveDialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? `Pay out ${selected.name}` : "Pay out"}
        description="Record a payment you've sent. This debits their wallet and emails them the earnings log."
        className="sm:max-w-2xl! md:max-w-2xl!"
      >
        {selected && (
          <PayoutForm key={selected.userId} row={selected} onDone={() => setSelected(null)} />
        )}
      </ResponsiveDialog>
    </section>
  );
}

function PayoutForm({ row, onDone }: { row: AwaitingBalanceRow; onDone: () => void }) {
  const router = useRouter();
  const [loadingPreview, setLoadingPreview] = React.useState(true);
  const [entries, setEntries] = React.useState<PayoutPreviewEntry[]>([]);
  const [method, setMethod] = React.useState<{ type: string; details: Record<string, string> } | null>(null);
  const [awaiting, setAwaiting] = React.useState(row.awaitingCents);
  const [amount, setAmount] = React.useState((row.awaitingCents / 100).toFixed(2));
  const [provider, setProvider] = React.useState(row.methodType ? capitalize(row.methodType) : "Wise");
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    adminGetPayoutPreview(row.userId).then((res) => {
      if (cancelled) return;
      setLoadingPreview(false);
      if (res.error) {
        toast.error("Could not load earnings", { description: res.error });
        return;
      }
      setEntries(res.entries || []);
      setMethod(res.method || null);
      if (typeof res.awaitingCents === "number") {
        setAwaiting(res.awaitingCents);
        setAmount((res.awaitingCents / 100).toFixed(2));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [row.userId]);

  const amountCents = Math.round(Number(amount) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents > 0 && amountCents <= awaiting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountValid) {
      toast.error(`Enter an amount between $0.01 and ${formatCents(awaiting)}.`);
      return;
    }
    setSaving(true);
    const res = await adminRecordPayout({
      userId: row.userId,
      amountCents,
      provider,
      reference,
      note,
    });
    setSaving(false);
    if (res.error) {
      toast.error("Could not record payout", { description: res.error });
      return;
    }
    toast.success(`${formatCents(amountCents)} marked as paid`, {
      description: `${row.name} has been emailed the payout details and earnings log.`,
    });
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
      {row.payoutsBlocked && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Payouts are blocked on this account. Make sure this payment is intended.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-border">
          <span className="text-muted-foreground block">Awaiting payout</span>
          <span className="font-mono font-bold text-base text-[#0F766E]">{formatCents(awaiting)}</span>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <span className="text-muted-foreground block">Their payout method</span>
          <span className="font-semibold text-foreground block truncate">
            {method ? `${method.type.toUpperCase()} · ${maskDetails(method.type, method.details)}` : "None added"}
          </span>
        </div>
      </div>

      <div>
        <span className="font-semibold text-foreground">Earnings since last payout</span>
        <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
          {loadingPreview ? (
            <div className="p-4 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-muted-foreground">No new earnings since the last payout.</div>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="px-3 py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-foreground block truncate">{e.note || "Approved work"}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {KIND_LABELS[e.kind] || e.kind} · {formatDate(e.createdAt)}
                  </span>
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${e.amountCents < 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {formatCents(e.amountCents)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="payout_amount" className="text-xs font-semibold">
            Amount paid (USD)
          </Label>
          <Input
            id="payout_amount"
            type="number"
            min="0.01"
            step="0.01"
            max={(awaiting / 100).toFixed(2)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 text-xs rounded-lg font-mono"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="payout_provider" className="text-xs font-semibold">
            Sent via
          </Label>
          <select
            id="payout_provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground"
          >
            {["Wise", "Payoneer", "M-Pesa", "Bank transfer", "Other"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="payout_ref" className="text-xs font-semibold">
          Transfer reference *
        </Label>
        <Input
          id="payout_ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. Wise transfer ID or Payoneer payment ID"
          className="h-10 text-xs rounded-lg font-mono"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="payout_note" className="text-xs font-semibold">
          Note to contributor (optional)
        </Label>
        <textarea
          id="payout_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Included in the email"
          className="w-full p-2.5 text-xs rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} className="rounded-full text-xs">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || loadingPreview || !amountValid || !reference.trim()}
          className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Mark {amountValid ? formatCents(amountCents) : ""} as paid &amp; email
        </Button>
      </div>
    </form>
  );
}

function capitalize(value: string) {
  if (value === "mpesa") return "M-Pesa";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
