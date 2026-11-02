"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  Users,
  LogOut,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  Menu,
  X,
  ClipboardCheck,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";

interface AdminNavProps {
  userEmail?: string;
  adminName?: string;
}

export function AdminNav({ userEmail, adminName }: AdminNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  const navItems = [
    { label: "Overview", href: "/admin", exact: true, icon: LayoutDashboard },
    { label: "Tasks", href: "/admin/tasks", exact: false, icon: CheckSquare },
    { label: "Reviews", href: "/admin/reviews", exact: false, icon: ClipboardCheck },
    { label: "Timesheets", href: "/admin/timesheets", exact: false, icon: Clock },
    { label: "Applications", href: "/admin/applications", exact: false, icon: FileSpreadsheet },
    { label: "Users", href: "/admin/users", exact: false, icon: Users },
    { label: "Payouts", href: "/admin/payouts", exact: false, icon: CreditCard },
    { label: "Finance", href: "/admin/finance", exact: false, icon: TrendingUp },
  ];

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand & Context */}
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-lg tracking-tight text-foreground">
                Revive<span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                Admin
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-full text-xs font-semibold gap-1.5 px-3.5 transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <Link href="/tasks" target="_blank" className="hidden sm:inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
            >
              <span>Public Directory</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>

          <div className="hidden sm:flex flex-col text-right pl-2 border-l border-border">
            <span className="text-xs font-bold text-foreground">
              {adminName || "Administrator"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
              {userEmail}
            </span>
          </div>

          <form action={signOutAction} className="hidden sm:inline-flex">
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              title="Sign out"
              className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </form>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"}
            aria-expanded={mobileOpen}
            className="md:hidden touch-target rounded-full text-foreground/80 hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Admin Menu Sheet */}
      {mobileOpen && mounted && createPortal(
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full bg-card text-card-foreground border-b border-border shadow-2xl max-h-[88dvh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-3 pb-safe">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
                  Admin Command Center
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close admin menu"
                  className="touch-target p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-3 py-2.5 bg-muted/40 rounded-xl border border-border">
                <span className="text-xs font-bold text-foreground block">
                  {adminName || "Administrator"}
                </span>
                <span className="text-[11px] text-muted-foreground truncate block">
                  {userEmail}
                </span>
              </div>

              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`touch-target flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted hover:text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <Link
                  href="/tasks"
                  target="_blank"
                  onClick={() => setMobileOpen(false)}
                  className="touch-target flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[44px]"
                >
                  <span>Public Directory</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </nav>

              <div className="pt-2 border-t border-border/80">
                <form action={signOutAction}>
                  <Button
                    variant="outline"
                    size="sm"
                    type="submit"
                    className="w-full rounded-full text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1.5 min-h-[44px]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
