"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionResult = {
  success?: boolean;
  error?: string;
};

export async function markNotificationAsRead(
  id: string
): Promise<NotificationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markNotificationRead(id: string): Promise<NotificationActionResult> {
  return await markNotificationAsRead(id);
}

export async function markAllNotificationsAsRead(): Promise<NotificationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  return await markAllNotificationsAsRead();
}
