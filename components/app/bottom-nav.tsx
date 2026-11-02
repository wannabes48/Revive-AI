"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/supabase/types";
import { signOutAction } from "@/actions/auth";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Wallet,
  MoreHorizontal,
  User,
  Bell,
  Compass,
  Shield,
  LogOut,
  X,
  ExternalLink,
} from "lucide-react";

interface BottomNavProps {
  role?: UserRole;
  unread?: number;
}

export function BottomNav({ role, unread = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Close sheet on route change
  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Lock body scroll when "More" sheet is open
  React.useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [moreOpen]);

  const tabs = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      label: "Work",
      href: "/work",
      icon: Briefcase,
      isActive: pathname.startsWith("/work"),
    },
    {
      label: "Applications",
      href: "/applications",
      icon: FileText,
      isActive: pathname.startsWith("/applications"),
    },
    {
      label: "Earnings",
      href: "/earnings",
      icon: Wallet,
      isActive: pathname.startsWith("/earnings"),
    },
  ];

  const isMoreActive =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/admin");

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-1 pb-safe flex items-center justify-around shadow-lg"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`touch-target flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 flex-1 min-h-[48px] ${
                active ? "text-[#0F766E]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`p-1 rounded-full transition-colors ${
                  active ? "bg-[#E5EFEC]" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  active ? "font-bold text-[#0F766E]" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-label="Open more navigation options"
          className={`touch-target flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 flex-1 min-h-[48px] ${
            isMoreActive || moreOpen
              ? "text-[#0F766E]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div
            className={`relative p-1 rounded-full transition-colors ${
              isMoreActive || moreOpen ? "bg-[#E5EFEC]" : ""
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              isMoreActive || moreOpen ? "font-bold text-[#0F766E]" : "font-medium"
            }`}
          >
            More
          </span>
        </button>
      </nav>

      {/* "More" Bottom Sheet Overlay */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation menu"
            className="relative z-10 w-full bg-card rounded-t-2xl border-t border-border shadow-2xl p-4 pb-safe space-y-4 animate-in slide-in-from-bottom duration-200"
          >
            {/* Header with Drag Pill & Close Button */}
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  Quick Navigation
                </span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                    {unread} unread
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="touch-target -mr-2 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="space-y-1.5">
              <Link
                href="/profile"
                onClick={() => setMoreOpen(false)}
                className="touch-target w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-sm font-semibold text-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span>Profile Settings</span>
                </div>
              </Link>

              <Link
                href="/notifications"
                onClick={() => setMoreOpen(false)}
                className="touch-target w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-sm font-semibold text-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center relative">
                    <Bell className="h-4 w-4" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent" />
                    )}
                  </div>
                  <span>Notifications</span>
                </div>
                {unread > 0 && (
                  <span className="text-xs font-bold text-primary">
                    {unread} new
                  </span>
                )}
              </Link>

              <Link
                href="/tasks"
                onClick={() => setMoreOpen(false)}
                className="touch-target w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-sm font-semibold text-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Compass className="h-4 w-4" />
                  </div>
                  <span>Browse Tasks</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              {role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="touch-target w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#E5EFEC] text-[#0F766E] hover:bg-[#E5EFEC]/80 transition-colors text-sm font-bold border border-[#0F766E]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span>Admin Console</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full bg-[#0F766E]/15 text-[#0F766E]">
                    Admin
                  </span>
                </Link>
              )}
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 border-t border-border/70">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="touch-target w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/15 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BottomNav;
