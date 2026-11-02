import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types";
import { ProfileEditor } from "./profile-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialTab = resolvedParams?.tab;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profileData) {
    redirect("/login");
  }

  const profile = profileData as Profile;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Header & Back Link */}
      <div className="space-y-3 pb-4 border-b border-border/60">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Contributor Profile
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Keep your credentials and specialty areas up-to-date to accelerate task review approvals.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Tab Interactive Editor */}
      <ProfileEditor profile={profile} initialTab={initialTab} />
    </div>
  );
}
