import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/actions/auth";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Shield, LogOut, FileText, User } from "lucide-react";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let userProfile = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";
    userProfile = profile;
  }

  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center relative shadow-xs group-hover:scale-105 transition-transform duration-150">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
              {/* Amber status beacon */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-card flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-[#855300] rounded-full" />
              </span>
            </div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-foreground">
              Revive<span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Primary Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/tasks"
              className="text-sm font-semibold text-foreground/85 hover:text-primary transition-colors py-1"
            >
              Tasks
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              How It Works
            </Link>
            <Link
              href="/#categories"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Domains
            </Link>
            <Link
              href="/#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              FAQ
            </Link>
          </nav>
        </div>

        {/* Auth / Action Cluster */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Button>
                </Link>
              )}

              <Link href="/applications" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  My Applications
                </Button>
              </Link>

              <Link href="/profile" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-semibold gap-1.5"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Button>
              </Link>

              <form action={signOutAction} className="inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  title="Sign out"
                  className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </form>

              <MobileNav
                user={user ? { id: user.id, email: user.email } : null}
                isAdmin={isAdmin}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-sm font-semibold text-foreground/80 hover:text-primary px-4"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/signup" className="hidden sm:inline-flex">
                <Button
                  size="sm"
                  className="rounded-full text-sm font-semibold px-5 shadow-xs transition-all duration-150"
                >
                  Sign up
                </Button>
              </Link>

              <MobileNav user={null} isAdmin={false} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
