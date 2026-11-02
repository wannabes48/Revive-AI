"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { payoutMethodSchema } from "@/lib/validators";
import { mapRpcError } from "@/lib/rpc-errors";
import { MIN_PAYOUT_CENTS } from "@/lib/constants";
import { formatCents } from "@/lib/utils";

export async function savePayoutMethod(input: unknown) {
  const parsed = payoutMethodSchema.safeParse(input);
  if (!parsed.success) {
    const firstErr = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstErr || "Please check your payout details and try again." };
  }

  const { type, label, ...details } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in to manage payout methods." };
  }

  // Check if this is the user's first method; if so, make it default
  const { count } = await supabase
    .from("payout_methods")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const isDefault = (count ?? 0) === 0;

  const { error } = await supabase.from("payout_methods").insert({
    user_id: user.id,
    type,
    label: label || undefined,
    details,
    is_default: isDefault,
  });

  if (error) {
    return { error: "Could not save payout method. Please try again." };
  }

  revalidatePath("/earnings");
  return { success: true };
}

export async function deletePayoutMethod(methodId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in." };

  const { error } = await supabase
    .from("payout_methods")
    .delete()
    .eq("id", methodId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/earnings");
  return { success: true };
}

export async function setDefaultPayoutMethod(methodId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in." };

  // Clear existing default first
  await supabase
    .from("payout_methods")
    .update({ is_default: false })
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("payout_methods")
    .update({ is_default: true })
    .eq("id", methodId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/earnings");
  return { success: true };
}

export async function requestPayout(methodId: string, amountCents: number) {
  if (amountCents < MIN_PAYOUT_CENTS) {
    return { error: `The minimum withdrawal is ${formatCents(MIN_PAYOUT_CENTS)}.` };
  }

  const supabase = await createClient();
  const { data: payoutId, error } = await supabase.rpc("request_payout", {
    p_method_id: methodId,
    p_amount_cents: amountCents,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/earnings");
  revalidatePath("/dashboard");
  return { success: true, payoutId };
}

export async function cancelMyPayout(payoutId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_payout", {
    p_id: payoutId,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/earnings");
  revalidatePath("/dashboard");
  return { success: true };
}
