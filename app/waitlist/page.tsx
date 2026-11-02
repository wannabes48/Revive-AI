import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Hourglass,
  Clock,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Mail,
  Briefcase,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const approvalStatus =
    (profile as any)?.approval_status ||
    user.user_metadata?.approval_status ||
    "approved";

  // If approved or admin, send directly to dashboard
  if (profile?.role === "admin" || approvalStatus === "approved") {
    redirect("/dashboard");
  }

  const isRejected = approvalStatus === "rejected";

  return (
    <div className="min-h-screen bg-gradient-to-b from-card via-background to-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-foreground">
            Revive<span className="text-primary">AI</span>
          </span>
        </Link>

        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </Button>
        </form>
      </header>

      {/* Main Waitlist Container */}
      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="bg-card rounded-[20px] border border-border p-6 sm:p-8 shadow-md space-y-6 text-center">
          {/* Status Icon */}
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center relative">
            {isRejected ? (
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shadow-xs">
                <Hourglass className="h-8 w-8 animate-pulse" />
              </div>
            )}
          </div>

          {/* Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-2xs">
            {isRejected ? (
              <span className="text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1 rounded-full">
                Admissions Closed For Cohort
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] px-3.5 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span>Waitlist Review In Progress</span>
              </div>
            )}
          </div>

          {/* Heading & Context */}
          <div className="space-y-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {isRejected
                ? "Account Review Concluded"
                : "You're on the ReviveAI Contributor Waitlist"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              {isRejected
                ? "Thank you for your interest in ReviveAI. At this time, our active evaluation cohorts in your domain are fully subscribed. We keep applications on file for future project expansions."
                : "To maintain frontier benchmark data quality and fair task allocation, new specialist accounts must be calibrated and approved by an administrator before accessing the active tasking dashboard."}
            </p>
          </div>

          {/* Contributor Profile Dossier Snapshot */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border text-left space-y-2.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Application Credentials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground/90 font-medium">
              <div>
                <span className="text-muted-foreground block text-[11px]">Specialist:</span>
                <span className="font-semibold text-foreground truncate block">
                  {profile?.full_name || user.email}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Account Email:</span>
                <span className="font-semibold text-foreground truncate block">{user.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Domain / Expertise:</span>
                <span className="font-semibold text-primary truncate block">
                  {profile?.expertise || "General Evaluation Specialist"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Admission Queue:</span>
                <span className="font-semibold text-foreground block">Active Review Queue</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link href="/waitlist" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-full text-xs font-semibold gap-1.5 h-10 px-5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Check Approval Status</span>
              </Button>
            </Link>

            <Link href="/tasks" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="w-full sm:w-auto rounded-full text-xs font-semibold gap-1.5 h-10 px-4 text-muted-foreground hover:text-foreground"
              >
                <span>Browse Public Tasks</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Average administrator review timeline: 1 to 3 business days</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-muted-foreground py-2">
        <p>© 2026 Revive AI. Enterprise-grade AI evaluation and expert benchmark tasking.</p>
      </footer>
    </div>
  );
}
