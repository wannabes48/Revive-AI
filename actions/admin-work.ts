"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SubmissionStatus, PayoutStatus, LedgerKind } from "@/lib/supabase/types";
import { mapRpcError } from "@/lib/rpc-errors";
import { notifyPayoutSent } from "@/lib/emails/automation";

export async function reviewSubmission(
  submissionId: string,
  decision: SubmissionStatus,
  note?: string,
  score?: number
) {
  const { supabase } = await requireAdmin();

  if (decision === "submitted") {
    return { error: "Please select an approval, rejection, or revision decision." };
  }

  if ((decision === "rejected" || decision === "revision_requested") && (!note || !note.trim())) {
    return { error: "A reviewer feedback note is required when rejecting or requesting revision." };
  }

  const { error } = await supabase.rpc("review_submission", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_note: note?.trim() || null,
    p_score: score ?? null,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  return { success: true };
}

export async function approveTimeEntry(
  entryId: string,
  approve: boolean,
  note?: string
) {
  const { supabase } = await requireAdmin();

  if (!approve && (!note || !note.trim())) {
    return { error: "A note explaining the rejection is required." };
  }

  const { error } = await supabase.rpc("approve_time_entry", {
    p_id: entryId,
    p_approve: approve,
    p_note: note?.trim() || null,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/timesheets");
  revalidatePath("/admin");
  return { success: true };
}

export async function importWorkItems(
  taskId: string,
  items: Array<{ external_ref?: string | null; payload: Record<string, any> }>
) {
  const { supabase } = await requireAdmin();

  if (!items || items.length === 0) {
    return { error: "No items found to import." };
  }

  if (items.length > 5000) {
    return { error: "Upload capped at 5,000 items per batch." };
  }

  let added = 0;
  let skipped = 0;
  let invalid = 0;

  // Process in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const validRows: any[] = [];

    for (const item of chunk) {
      if (!item.payload || typeof item.payload !== "object" || Object.keys(item.payload).length === 0) {
        invalid++;
        continue;
      }

      validRows.push({
        task_id: taskId,
        external_ref: item.external_ref ? String(item.external_ref).trim() : null,
        payload: item.payload,
        status: "available",
      });
    }

    if (validRows.length > 0) {
      // Upsert with ignore duplicates on conflict (task_id, external_ref)
      const { data, error } = await supabase
        .from("work_items")
        .upsert(validRows, {
          onConflict: "task_id, external_ref",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) {
        // Fallback: insert one by one or report error
        return { error: `Batch import error: ${error.message}` };
      }

      const insertedCount = data?.length ?? 0;
      added += insertedCount;
      skipped += validRows.length - insertedCount;
    }
  }

  revalidatePath(`/admin/tasks/${taskId}/items`);
  revalidatePath("/admin/tasks");

  return {
    success: true,
    added,
    skipped,
    invalid,
    total: items.length,
  };
}

export async function deleteWorkItem(itemId: string, taskId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("work_items")
    .delete()
    .eq("id", itemId)
    .eq("status", "available");

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/tasks/${taskId}/items`);
  return { success: true };
}

export async function forceReleaseItem(itemId: string, taskId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("work_items")
    .update({
      status: "available",
      claimed_by: null,
      claimed_at: null,
      claim_expires_at: null,
    })
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/tasks/${taskId}/items`);
  return { success: true };
}

export async function adminProcessPayout(
  payoutId: string,
  status: PayoutStatus,
  provider?: string,
  ref?: string,
  reason?: string
) {
  const { supabase } = await requireAdmin();

  if (status === "paid" && (!ref || !ref.trim())) {
    return { error: "A transaction provider reference code (e.g. Wise transfer ID or Payoneer reference) is required to mark as paid." };
  }

  if ((status === "failed" || status === "cancelled") && (!reason || !reason.trim())) {
    return { error: "A failure / cancellation reason is required." };
  }

  const { error } = await supabase.rpc("process_payout", {
    p_id: payoutId,
    p_status: status,
    p_provider: provider?.trim() || null,
    p_ref: ref?.trim() || null,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  if (status === "paid") await notifyPayoutSent(payoutId);

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/finance");
  return { success: true };
}

export type PayoutPreviewEntry = {
  id: string;
  kind: string;
  amountCents: number;
  note: string | null;
  createdAt: string;
  availableAt: string;
};

/** Earnings a contributor has accrued since their last payout, for the "mark as paid" dialog. */
export async function adminGetPayoutPreview(userId: string): Promise<{
  error?: string;
  entries?: PayoutPreviewEntry[];
  awaitingCents?: number;
  method?: { type: string; details: Record<string, string> } | null;
  lastPayoutAt?: string | null;
}> {
  const { supabase } = await requireAdmin();

  const [{ data: ledger, error }, { data: methods }] = await Promise.all([
    supabase
      .from("ledger_entries")
      .select("id, kind, amount_cents, note, created_at, available_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payout_methods")
      .select("type, details, is_default, created_at")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (error) return { error: error.message };

  const rows = ledger || [];
  const awaitingCents = rows.reduce((sum, r) => sum + Number(r.amount_cents), 0);
  const lastPayout = [...rows].reverse().find((r) => r.kind === "payout");
  const entries = rows
    .filter(
      (r) =>
        r.kind !== "payout" &&
        (!lastPayout || new Date(r.created_at) > new Date(lastPayout.created_at))
    )
    .reverse()
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      amountCents: Number(r.amount_cents),
      note: r.note,
      createdAt: r.created_at,
      availableAt: r.available_at,
    }));

  return {
    entries,
    awaitingCents,
    method: methods?.[0] ? { type: methods[0].type, details: methods[0].details } : null,
    lastPayoutAt: lastPayout?.created_at ?? null,
  };
}

/** Records funds sent to a contributor, debits their wallet and emails them the earnings log. */
export async function adminRecordPayout(input: {
  userId: string;
  amountCents: number;
  provider: string;
  reference: string;
  note?: string;
}) {
  const { supabase } = await requireAdmin();

  if (!input.reference?.trim()) {
    return { error: "Enter the transfer reference (e.g. Wise transfer ID or Payoneer payment ID)." };
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { error: "Enter an amount greater than $0.00." };
  }

  const { data: payoutId, error } = await supabase.rpc("admin_record_payout", {
    p_user: input.userId,
    p_amount: input.amountCents,
    p_provider: input.provider?.trim() || null,
    p_ref: input.reference.trim(),
    p_note: input.note?.trim() || null,
  });

  if (error) {
    if (/admin_record_payout|function .* does not exist/i.test(error.message)) {
      return { error: "Apply supabase/012_hourly_auto_approve_and_manual_payouts.sql to enable payouts." };
    }
    return {
      error: error.message.includes("insufficient_funds")
        ? "That is more than this contributor's awaiting balance."
        : mapRpcError(error.message),
    };
  }

  if (payoutId) await notifyPayoutSent(payoutId as string);

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/finance");
  revalidatePath("/earnings");
  return { success: true, payoutId: payoutId as string };
}

export async function adminTogglePayoutsBlocked(userId: string, blocked: boolean) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ payouts_blocked: blocked })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/users");
  return { success: true, blocked };
}

export async function adminAdjustLedger(
  userId: string,
  kind: LedgerKind,
  amountCents: number,
  note: string
) {
  const { supabase } = await requireAdmin();

  if (!note || !note.trim()) {
    return { error: "A written note explaining this adjustment is required." };
  }

  if (amountCents === 0) {
    return { error: "Amount cannot be zero." };
  }

  const { error } = await supabase.rpc("admin_adjust", {
    p_user: userId,
    p_kind: kind,
    p_amount: amountCents,
    p_note: note.trim(),
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/finance");
  return { success: true };
}
