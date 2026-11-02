import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/site-footer";
import { MorphingScrollNavbar } from "@/components/ui/morphing-scroll-navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Shield, LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  const brand = (
    <div className="flex items-center gap-2 group cursor-pointer">
      <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs group-hover:scale-105 transition-transform duration-150">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="font-heading font-extrabold text-xl tracking-tight text-foreground">
        Revive<span className="text-primary">AI</span>
      </span>
    </div>
  );

  const actions = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
      {user ? (
        <>
          {isAdmin && (
            <Link href="/admin" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto rounded-full text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 min-h-[44px] sm:min-h-0 sm:h-9"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Button>
            </Link>
          )}
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto rounded-full text-xs font-semibold gap-1.5 min-h-[44px] sm:min-h-0 sm:h-9 px-4">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>
          <form action={signOutAction} className="inline-flex w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              title="Sign out"
              className="w-full sm:w-auto rounded-full min-h-[44px] sm:min-h-0 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5 sm:mr-0" />
              <span className="sm:hidden text-xs font-semibold">Sign out</span>
            </Button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto rounded-full text-xs sm:text-sm font-semibold text-foreground/80 hover:text-primary px-3 sm:px-4 min-h-[44px] sm:min-h-0 sm:h-9"
            >
              Log in
            </Button>
          </Link>
          <Link href="/signup" className="w-full sm:w-auto">
            <Button
              size="sm"
              className="w-full sm:w-auto rounded-full text-xs sm:text-sm font-semibold px-4 sm:px-5 min-h-[44px] sm:min-h-0 sm:h-9 shadow-xs"
            >
              Apply as Expert
            </Button>
          </Link>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MorphingScrollNavbar
        brand={brand}
        actions={actions}
      />
      <main className="flex-1 pt-14 sm:pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
