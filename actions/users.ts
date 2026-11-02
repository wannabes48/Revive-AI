"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/supabase/types";

export type UserActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<UserActionResult> {
  const { supabase, user } = await requireAdmin();

  // Prevent self-demotion
  if (user.id === userId && newRole !== "admin") {
    return { error: "Security restriction: You cannot demote your own administrator account." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");

  return { success: true, message: `User role updated to ${newRole}.` };
}

export async function getUserApplications(userId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      user_id,
      status,
      note,
      position,
      admin_note,
      created_at,
      updated_at,
      tasks (
        id,
        slug,
        title,
        category,
        pay_min,
        pay_max,
        pay_unit,
        location,
        commitment,
        status
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user applications:", error);
    return [];
  }
  return data || [];
}

export async function adminUpdateUserProfile(
  userId: string,
  data: {
    full_name?: string;
    headline?: string;
    bio?: string;
    country?: string;
    expertise?: string;
    weekly_hours?: number | null;
    phone?: string;
  }
): Promise<UserActionResult> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name?.trim() || null,
      headline: data.headline?.trim() || null,
      bio: data.bio?.trim() || null,
      country: data.country?.trim() || null,
      expertise: data.expertise?.trim() || null,
      weekly_hours: data.weekly_hours ?? null,
      phone: data.phone?.trim() || null,
    })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true, message: "User profile updated successfully." };
}

export async function adminSendNotification(
  userId: string,
  title: string,
  body?: string,
  href?: string
): Promise<UserActionResult> {
  const { supabase } = await requireAdmin();

  if (!title.trim()) {
    return { error: "Notification title is required." };
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "admin_message",
    title: title.trim(),
    body: body?.trim() || null,
    href: href?.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/notifications");
  return { success: true, message: "Notification delivered to user." };
}

export async function adminDeleteUser(userId: string): Promise<UserActionResult> {
  const { supabase, user } = await requireAdmin();

  if (user.id === userId) {
    return { error: "Security restriction: You cannot delete your own administrator account." };
  }

  try {
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) {
      // Fallback: delete from profiles table directly
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
      if (profileError) return { error: profileError.message };
    }
  } catch (err: any) {
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) return { error: profileError.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true, message: "User account deleted successfully." };
}

export async function approveUserAccount(userId: string): Promise<UserActionResult> {
  const { supabase } = await requireAdmin();

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { approval_status: "approved" },
    });
  } catch (err) {
    console.warn("Failed to update user_metadata in auth:", err);
  }

  try {
    await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", userId);
  } catch (err) {
    console.warn("Profiles table approval_status update notice:", err);
  }

  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "admin_message",
      title: "Account Approved! Welcome to Revive AI",
      body: "Your contributor admission has been verified and approved by the administrative team. You now have full access to project onboarding and active tasking.",
      href: "/dashboard",
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/waitlist");

  return { success: true, message: "Contributor account approved successfully." };
}

export async function rejectUserAccount(
  userId: string,
  reason?: string
): Promise<UserActionResult> {
  const { supabase } = await requireAdmin();

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { approval_status: "rejected" },
    });
  } catch (err) {
    console.warn("Failed to update user_metadata in auth:", err);
  }

  try {
    await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", userId);
  } catch (err) {
    console.warn("Profiles table approval_status update notice:", err);
  }

  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "admin_message",
      title: "Admissions Update",
      body:
        reason ||
        "Your application could not be admitted for tasking at this time. Thank you for your interest in Revive AI.",
      href: "/waitlist",
    });
  } catch {
    // Non-fatal
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/waitlist");

  return { success: true, message: "User account status updated to rejected." };
}

export async function updateUserKycStatus(
  userId: string,
  kycStatus: "unverified" | "pending" | "verified" | "rejected"
): Promise<UserActionResult> {
  const { supabase } = await requireAdmin();

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { kyc_status: kycStatus },
    });
  } catch (err) {
    console.warn("Failed to update user_metadata in auth:", err);
  }

  try {
    await supabase
      .from("profiles")
      .update({ kyc_status: kycStatus })
      .eq("id", userId);
  } catch (err) {
    console.warn("Profiles table kyc_status update notice:", err);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return { success: true, message: `KYC verification status updated to ${kycStatus}.` };
}
