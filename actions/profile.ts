"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  basicsSchema,
  expertiseSchema,
  backgroundSchema,
  availabilitySchema,
  passwordSchema,
  profileSchema,
} from "@/lib/validators";
import { Json } from "@/types/supabase";

export type ProfileActionResult = {
  success?: boolean;
  error?: string | Record<string, string[]>;
  message?: string;
};

export async function saveBasics(input: unknown): Promise<ProfileActionResult> {
  const parsed = basicsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      country: parsed.data.country,
      timezone: parsed.data.timezone || null,
      phone: parsed.data.phone || null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true, message: "Basic details updated successfully." };
}

export async function saveExpertise(input: unknown): Promise<ProfileActionResult> {
  const parsed = expertiseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      expertise: parsed.data.expertise,
      skills: parsed.data.skills,
      languages: parsed.data.languages,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save expertise." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true, message: "Expertise updated successfully." };
}

export async function saveBackground(input: unknown): Promise<ProfileActionResult> {
  const parsed = backgroundSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      education: parsed.data.education as unknown as Json,
      experience: parsed.data.experience as unknown as Json,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save credentials background." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true, message: "Education and experience saved." };
}

export async function saveAvailability(input: unknown): Promise<ProfileActionResult> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      weekly_hours: parsed.data.weekly_hours ?? null,
      linkedin_url: parsed.data.linkedin_url || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save availability." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true, message: "Availability updated successfully." };
}

export async function changePassword(input: unknown): Promise<ProfileActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Password updated successfully." };
}

export async function requestAccountDeletion(): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: user.id,
    type: "account_deletion_request",
    title: "Account Deletion Requested",
    body: "Your request has been logged. Compliance administrators will review and process your request within 48 hours.",
  });

  if (error) {
    return { error: "Could not submit deletion request." };
  }

  return {
    success: true,
    message: "Your deletion request has been submitted to platform administrators.",
  };
}

// Backwards-compatible generic updateProfile
export async function updateProfile(
  input: FormData | Record<string, any>
): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  let rawData: Record<string, any>;
  if (input instanceof FormData) {
    const parseJsonField = (field: string, fallback: any) => {
      const val = input.get(field);
      if (!val) return fallback;
      try {
        return JSON.parse(val as string);
      } catch {
        return fallback;
      }
    };

    rawData = {
      full_name: (input.get("full_name") as string)?.trim() || "",
      headline: (input.get("headline") as string)?.trim() || null,
      phone: (input.get("phone") as string)?.trim() || null,
      country: (input.get("country") as string)?.trim() || "",
      expertise: (input.get("expertise") as string)?.trim() || "",
      timezone: (input.get("timezone") as string)?.trim() || null,
      weekly_hours: input.get("weekly_hours") ? Number(input.get("weekly_hours")) : null,
      linkedin_url: (input.get("linkedin_url") as string)?.trim() || null,
      avatar_url: (input.get("avatar_url") as string)?.trim() || null,
      bio: (input.get("bio") as string)?.trim() || null,
      skills: parseJsonField("skills", []),
      languages: parseJsonField("languages", []),
      education: parseJsonField("education", []),
      experience: parseJsonField("experience", []),
    };
  } else {
    rawData = input;
  }

  const parsed = profileSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      headline: parsed.data.headline || null,
      phone: parsed.data.phone || null,
      country: parsed.data.country,
      expertise: parsed.data.expertise,
      timezone: parsed.data.timezone || null,
      weekly_hours: parsed.data.weekly_hours || null,
      linkedin_url: parsed.data.linkedin_url || null,
      avatar_url: parsed.data.avatar_url || null,
      bio: parsed.data.bio || null,
      skills: parsed.data.skills || [],
      languages: parsed.data.languages || [],
      education: (parsed.data.education || []) as unknown as Json,
      experience: (parsed.data.experience || []) as unknown as Json,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/applications");

  return { success: true, message: "Your profile has been saved successfully." };
}
