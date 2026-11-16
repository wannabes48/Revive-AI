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
  ShieldCheck,
  Briefcase,
  ChevronRight,
  UserCheck,
} from "lucide-react";

interface AdminSidebarLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  adminName?: string;
  avatarUrl?: string;
}

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Command Center",
    items: [
      {
        label: "Overview",
        href: "/admin",
        exact: true,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Operations & Work",
    items: [
      {
        label: "Disciplinary Tasks",
        href: "/admin/tasks",
        exact: false,
        icon: CheckSquare,
      },
      {
        label: "Review Queue",
        href: "/admin/reviews",
        exact: false,
        icon: ClipboardCheck,
      },
      {
        label: "Timesheets",
        href: "/admin/timesheets",
        exact: false,
        icon: Clock,
      },
      {
        label: "Task Applications",
        href: "/admin/applications",
        exact: false,
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: "Fellows & Compliance",
    items: [
      {
        label: "Users & Admissions",
        href: "/admin/users",
        exact: false,
        icon: Users,
      },
      {
        label: "KYC Verifications",
        href: "/admin/kyc",
        exact: false,
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Financial Operations",
    items: [
      {
        label: "Payouts Queue",
        href: "/admin/payouts",
        exact: false,
        icon: CreditCard,
      },
      {
        label: "Ledger & Finance",
        href: "/admin/finance",
        exact: false,
        icon: TrendingUp,
      },
    ],
  },
];

export function AdminSidebarLayout({
  children,
  userEmail,
  adminName,
  avatarUrl,
}: AdminSidebarLayoutProps) {
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

  const displayName = adminName || userEmail?.split("@")[0] || "Administrator";
  const initials = displayName.charAt(0).toUpperCase();

  const renderNavSection = (section: NavSection, isMobile = false) => (
    <div key={section.title} className="space-y-1">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {section.title}
      </div>
      <div className="space-y-0.5">
        {section.items.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? "bg-[#0F766E] text-white shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* ======================================================== */}
      {/* 1. DESKTOP PERMANENT SIDEBAR (>= lg)                     */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-border bg-card/70 backdrop-blur-md h-screen sticky top-0 select-none">
        {/* Brand & Portal Badge */}
        <div className="h-16 px-5 border-b border-border/80 flex items-center justify-between shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-lg tracking-tight text-foreground">
                Revive<span className="text-[#0F766E]">AI</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {NAV_SECTIONS.map((section) => renderNavSection(section, false))}

          {/* Quick Shortcuts */}
          <div className="pt-2 border-t border-border/60 space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Shortcuts
            </div>
            <Link
              href="/dashboard"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="h-4 w-4" />
                <span>Fellow Workspace</span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            </Link>

            <Link
              href="/tasks"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4" />
                <span>Public Directory</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Bottom Profile & Sign-out */}
        <div className="p-3 border-t border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-card">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0F766E]/15 text-[#0F766E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#0F766E]/20 overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 truncate">
                <span className="text-xs font-bold text-foreground block truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {userEmail}
                </span>
              </div>
            </div>

            <form action={signOutAction} className="shrink-0">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                title="Sign out of Administrator Console"
                className="rounded-lg h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP HEADER (< lg)                              */}
      {/* ======================================================== */}
      <header className="lg:hidden sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Admin Navigation Sidebar"
            className="p-2 -ml-2 rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
                Revive<span className="text-[#0F766E]">AI</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                Admin
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="hidden sm:inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs h-8 px-3 font-semibold text-muted-foreground"
            >
              Workspace
            </Button>
          </Link>

          <form action={signOutAction}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              title="Sign out"
              className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MOBILE SLIDE-OUT DRAWER (< lg)                        */}
      {/* ======================================================== */}
      {mobileOpen && mounted && createPortal(
        <div className="lg:hidden fixed inset-0 z-50 flex pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative z-10 w-72 sm:w-80 h-full bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="font-heading font-bold text-base text-foreground">
                  Admin Navigation
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close Admin Navigation"
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {NAV_SECTIONS.map((section) => renderNavSection(section, true))}

              <div className="pt-2 border-t border-border/60 space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Shortcuts
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-4 w-4" />
                    <span>Fellow Workspace</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                </Link>

                <Link
                  href="/tasks"
                  target="_blank"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="h-4 w-4" />
                    <span>Public Directory</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border bg-muted/20 shrink-0">
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-card mb-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {userEmail}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E5EFEC] text-[#0F766E]">
                  Admin
                </span>
              </div>

              <form action={signOutAction}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="w-full rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1.5 h-9"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 4. MAIN WORKSPACE / CONTENT REGION                       */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
