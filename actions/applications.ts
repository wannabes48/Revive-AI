"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/emails/resend";
import {
  applicationReceivedEmail,
  applicationStatusChangedEmail,
} from "@/lib/emails/templates";
import { ApplicationStatus, Profile } from "@/lib/supabase/types";
import { profileCompleteness } from "@/lib/profile";
import { MIN_PROFILE_TO_APPLY } from "@/lib/constants";

export type ApplicationActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
  redirect?: string;
};

/**
 * Apply to Task action
 */
export async function applyToTask(
  taskId: string,
  note?: string
): Promise<ApplicationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in to apply." };
  }

  // Apply gate: verify contributor profile completeness meets threshold
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const completeness = profileCompleteness(profile as Profile);
  if (completeness.score < MIN_PROFILE_TO_APPLY) {
    return {
      error: "Complete your profile to apply.",
      redirect: "/profile",
    };
  }

  // Confirm task is open
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, slug, status")
    .eq("id", taskId)
    .single();

  if (task && task.status !== "open") {
    return { error: "This task is not open for applications." };
  }

  const { error } = await supabase.from("applications").insert({
    task_id: taskId,
    user_id: user.id,
    note: note ?? null,
  });

  if (error?.code === "23505") {
    return { error: "You already applied to this task." };
  }
  if (error) {
    return { error: "Could not submit your application." };
  }

  // Safe background email dispatch
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const recipientName =
      profile?.full_name || user.email?.split("@")[0] || "Contributor";
    const taskTitle = task?.title || "Evaluation Task";

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `Application Received: ${taskTitle}`,
        html: applicationReceivedEmail(recipientName, taskTitle),
      });
    }
  } catch (err) {
    console.warn("Application confirmation email skipped:", err);
  }

  if (task?.slug) {
    revalidatePath(`/tasks/${task.slug}`);
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Your application has been received and queued on the task waitlist.",
  };
}

/**
 * Admin status change action
 */
export async function setApplicationStatus(
  id: string,
  status: "approved" | "rejected" | "waitlisted" | "withdrawn",
  adminNote?: string
): Promise<ApplicationActionResult> {
  const { supabase } = await requireAdmin();

  // Fetch task & profile relation for notifications
  const { data: currentApp } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      tasks (
        title,
        slug
      ),
      profiles (
        full_name,
        email
      )
    `)
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("applications")
    .update({
      status,
      admin_note: adminNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // Safe background status email dispatch
  if (currentApp) {
    try {
      const profile = currentApp.profiles as unknown as {
        full_name: string | null;
        email: string;
      } | null;
      const task = currentApp.tasks as unknown as {
        title: string;
        slug: string;
      } | null;

      if (profile?.email && task?.title) {
        const recipientName =
          profile.full_name || profile.email.split("@")[0] || "Contributor";
        await sendEmail({
          to: profile.email,
          subject: `Application Status Updated: ${task.title}`,
          html: applicationStatusChangedEmail(
            recipientName,
            task.title,
            status,
            adminNote
          ),
        });
      }
    } catch (emailErr) {
      console.warn("Status update email dispatch skipped:", emailErr);
    }
  }

  revalidatePath("/admin/applications");
  if (currentApp?.task_id) {
    revalidatePath(`/admin/tasks/${currentApp.task_id}/waitlist`);
  }
  revalidatePath("/applications");
  revalidatePath("/admin");

  return { success: true, message: `Application status updated to ${status}.` };
}

/**
 * Withdraw application action
 */
export async function withdrawApplication(
  applicationId: string,
  taskSlug?: string
): Promise<ApplicationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  if (!applicationId) {
    return { error: "Invalid application ID." };
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "withdrawn",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (taskSlug) {
    revalidatePath(`/tasks/${taskSlug}`);
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Application status updated to withdrawn.",
  };
}

/**
 * Re-apply to task (returns to waitlist after withdrawing)
 */
export async function reapplyApplication(
  applicationId: string,
  taskSlug?: string
): Promise<ApplicationActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  if (!applicationId) {
    return { error: "Invalid application ID." };
  }

  const { error } = await supabase.rpc("reapply", {
    p_application_id: applicationId,
  });

  if (error) {
    return { error: error.message };
  }

  if (taskSlug) {
    revalidatePath(`/tasks/${taskSlug}`);
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "You have rejoined the waitlist for this task.",
  };
}

export async function reapplyToTask(
  applicationId: string,
  taskSlug?: string
): Promise<ApplicationActionResult> {
  return await reapplyApplication(applicationId, taskSlug);
}

/**
 * Bulk action: bulkSetApplicationStatus(ids, status, adminNote?)
 */
export async function bulkSetApplicationStatus(
  ids: string[],
  status: ApplicationStatus,
  adminNote?: string
): Promise<ApplicationActionResult> {
  if (!ids || ids.length === 0) {
    return { error: "No applicants selected." };
  }

  let errorCount = 0;
  for (const id of ids) {
    const res = await setApplicationStatus(id, status, adminNote);
    if (!res.success) {
      errorCount++;
    }
  }

  if (errorCount > 0) {
    return { error: `Updated with ${errorCount} errors.` };
  }

  return { success: true, message: `Successfully updated ${ids.length} applicants.` };
}

/**
 * Move application action (swaps positions with neighbor)
 */
export async function moveApplication(
  id: string,
  direction: "up" | "down"
): Promise<ApplicationActionResult> {
  const { supabase } = await requireAdmin();

  // 1. Get current application
  const { data: currentApp, error: fetchError } = await supabase
    .from("applications")
    .select("id, task_id, position")
    .eq("id", id)
    .single();

  if (fetchError || !currentApp || currentApp.position == null) {
    return { error: "Application not found or position not assigned." };
  }

  const currentPos = currentApp.position;

  // 2. Find neighbour
  let neighborQuery = supabase
    .from("applications")
    .select("id, position")
    .eq("task_id", currentApp.task_id);

  if (direction === "up") {
    neighborQuery = neighborQuery
      .lt("position", currentPos)
      .order("position", { ascending: false })
      .limit(1);
  } else {
    neighborQuery = neighborQuery
      .gt("position", currentPos)
      .order("position", { ascending: true })
      .limit(1);
  }

  const { data: neighbors, error: neighborError } = await neighborQuery;

  if (neighborError || !neighbors || neighbors.length === 0) {
    return { message: "Already at the boundary of the waitlist queue." };
  }

  const neighbor = neighbors[0];
  const neighborPos = neighbor.position;

  // 3. Swap positions safely
  await supabase
    .from("applications")
    .update({ position: -999999 })
    .eq("id", currentApp.id);

  await supabase
    .from("applications")
    .update({ position: currentPos })
    .eq("id", neighbor.id);

  await supabase
    .from("applications")
    .update({ position: neighborPos })
    .eq("id", currentApp.id);

  revalidatePath(`/admin/tasks/${currentApp.task_id}/waitlist`);

  return {
    success: true,
    message: `Reordered applicant to position #${neighborPos}.`,
  };
}

// Form action helpers
export async function applyToTaskAction(
  formData: FormData
): Promise<ApplicationActionResult> {
  const taskId = formData.get("taskId") as string;
  const note = (formData.get("note") as string) || undefined;
  return await applyToTask(taskId, note);
}

export async function withdrawApplicationAction(
  applicationId: string,
  taskSlug?: string
): Promise<ApplicationActionResult> {
  return await withdrawApplication(applicationId, taskSlug);
}

export async function getApplicationTimeline(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Verify ownership
  const { data: app } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .single();

  if (!app) return [];

  const { data: events } = await supabase
    .from("application_events")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  return events || [];
}
