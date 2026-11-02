"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators";
import { sendEmail } from "@/lib/emails/resend";
import { welcomeEmail } from "@/lib/emails/templates";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
}

export type ActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
};

export async function signUpAction(formData: FormData): Promise<ActionResponse> {
  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const password = formData.get("password");
  const expertise = formData.get("expertise") || formData.get("domain");

  const rawData = {
    fullName: typeof fullName === "string" ? fullName.trim() : "",
    email: typeof email === "string" ? email.trim() : "",
    password: typeof password === "string" ? password : "",
    expertise: typeof expertise === "string" ? expertise.trim() : "",
  };

  const parsed = signupSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const { fullName: validFullName, email: validEmail, password: validPassword, expertise: validExpertise } = parsed.data;
  const origin = await getOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: validEmail,
    password: validPassword,
    options: {
      data: {
        full_name: validFullName,
        expertise: validExpertise || undefined,
        approval_status: "waitlisted",
        kyc_status: "unverified",
      },
      emailRedirectTo: `${origin}/auth/callback?next=/waitlist`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    try {
      await supabase
        .from("profiles")
        .update({
          expertise: validExpertise || undefined,
          approval_status: "waitlisted",
          kyc_status: "unverified",
        })
        .eq("id", data.user.id);
    } catch {
      await supabase
        .from("profiles")
        .update({
          expertise: validExpertise || undefined,
        })
        .eq("id", data.user.id);
    }
  }

  // Attempt to trigger welcome email
  try {
    await sendEmail({
      to: validEmail,
      subject: "Welcome to Revive AI — Expert Tasking Platform",
      html: welcomeEmail(validFullName),
    });
  } catch (err) {
    console.error("Welcome email failed to dispatch:", err);
  }

  // If session exists immediately (e.g., auto-confirm enabled in Supabase)
  if (data.session) {
    redirect("/waitlist");
  }

  return {
    success: true,
    message: "Account created! Please check your email to confirm your account and get started.",
  };
}

export async function signInAction(
  formData: FormData,
  redirectTo?: string | null
): Promise<ActionResponse> {
  const email = formData.get("email");
  const password = formData.get("password");

  const rawData = {
    email: typeof email === "string" ? email.trim() : "",
    password: typeof password === "string" ? password : "",
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid credentials." };
  }

  const { email: validEmail, password: validPassword } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validEmail,
    password: validPassword,
  });

  if (error) {
    return { error: error.message };
  }

  // Determine user destination based on role and admin approval status
  let destination = redirectTo || "/dashboard";

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    const approvalStatus =
      (profile as any)?.approval_status ||
      data.user.user_metadata?.approval_status ||
      "approved";

    if (profile?.role === "admin") {
      destination = redirectTo || "/admin";
    } else if (approvalStatus === "waitlisted" || approvalStatus === "rejected") {
      destination = "/waitlist";
    } else {
      destination = redirectTo || "/dashboard";
    }
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionResponse> {
  const email = formData.get("email");

  const rawData = {
    email: typeof email === "string" ? email.trim() : "",
  };

  const parsed = forgotPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Please enter a valid email address." };
  }

  const { email: validEmail } = parsed.data;
  const origin = await getOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validEmail, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "A password reset link has been sent to your email address if an account exists.",
  };
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResponse> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  const rawData = {
    password: typeof password === "string" ? password : "",
    confirmPassword: typeof confirmPassword === "string" ? confirmPassword : "",
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Passwords do not match." };
  }

  const { password: validPassword } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: validPassword,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard?reset=success");
}
