import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  RESUME_BUCKET,
  RESUME_MAX_BYTES,
  detectResumeType,
  safeResumeFilename,
} from "@/lib/resume";

export const runtime = "nodejs";

async function ensureBucket(adminClient: ReturnType<typeof createAdminClient>) {
  const { error } = await adminClient.storage.createBucket(RESUME_BUCKET, {
    public: false,
    fileSizeLimit: RESUME_MAX_BYTES,
  });
  if (error && !/already exists/i.test(error.message)) {
    console.error("Could not create resumes bucket:", error);
  }
}

/** Upload or replace the signed-in contributor's resume. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Upload could not be read. Please try again." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > RESUME_MAX_BYTES) {
    return NextResponse.json({ error: "Your resume must be 4 MB or smaller." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectResumeType(bytes, file.name);
  if (!type) {
    return NextResponse.json(
      { error: "Upload your resume as a PDF or Word document (.pdf, .doc, .docx)." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const filename = safeResumeFilename(file.name, type.extension);
  const path = `${user.id}/${Date.now()}-${filename}`;

  const upload = () =>
    adminClient.storage.from(RESUME_BUCKET).upload(path, bytes, {
      contentType: type.mime,
      upsert: false,
    });

  let { error: uploadError } = await upload();
  if (uploadError && /bucket not found/i.test(uploadError.message)) {
    await ensureBucket(adminClient);
    ({ error: uploadError } = await upload());
  }
  if (uploadError) {
    console.error("Resume upload failed:", uploadError);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const { data: previous } = await adminClient
    .from("profiles")
    .select("resume_path")
    .eq("id", user.id)
    .maybeSingle();

  const uploadedAt = new Date().toISOString();
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ resume_path: path, resume_filename: filename, resume_uploaded_at: uploadedAt })
    .eq("id", user.id);

  if (profileError) {
    console.error("Could not save resume on profile:", profileError);
    await adminClient.storage.from(RESUME_BUCKET).remove([path]);
    return NextResponse.json(
      { error: "Your resume uploaded but couldn't be saved to your profile. Please try again." },
      { status: 500 }
    );
  }

  if (previous?.resume_path && previous.resume_path !== path) {
    await adminClient.storage.from(RESUME_BUCKET).remove([previous.resume_path]);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return NextResponse.json({ filename, uploadedAt });
}

/**
 * Opens a resume through a short-lived signed link. Contributors can open their
 * own; admins can open anyone's with `?userId=`.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const adminClient = createAdminClient();
  const requested = new URL(req.url).searchParams.get("userId");
  let targetId = user.id;

  if (requested && requested !== user.id) {
    const { data: me } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (me?.role !== "admin") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    targetId = requested;
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("resume_path, resume_filename")
    .eq("id", targetId)
    .maybeSingle();
  if (!profile?.resume_path) {
    return NextResponse.json({ error: "No resume uploaded." }, { status: 404 });
  }

  const { data, error } = await adminClient.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(profile.resume_path, 300, { download: profile.resume_filename || true });
  if (error || !data?.signedUrl) {
    console.error("Could not sign resume URL:", error);
    return NextResponse.json({ error: "Could not open the resume." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
