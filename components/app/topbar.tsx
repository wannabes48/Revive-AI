"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Profile } from "@/lib/supabase/types";
import { signOutAction } from "@/actions/auth";
import { NotificationBell } from "@/components/app/notification-bell";
import {
  Bell,
  Sparkles,
  User,
  LayoutDashboard,
  FileText,
  Shield,
  LogOut,
  Compass,
  ExternalLink,
} from "lucide-react";

interface TopbarProps {
  profile: Profile | null;
  unread: number;
}

export function Topbar({ profile, unread }: TopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route changes
  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Page title mapping based on current route
  function getPageTitle(path: string): string {
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/profile")) return "Profile Settings";
    if (path.startsWith("/applications")) return "My Applications";
    if (path.startsWith("/notifications")) return "Notifications";
    if (path.startsWith("/tasks")) return "Task Catalog";
    return "Contributor Portal";
  }

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Contributor";
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile Brand Logo / Desktop Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Logo (< md) */}
        <Link href="/dashboard" className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
            Revive<span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Desktop Page Title (>= md) */}
        <div className="hidden md:block">
          <h1 className="font-heading text-lg font-bold text-foreground">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      {/* Right Controls: Notifications Bell & Avatar Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <NotificationBell unreadCount={unread} />

        {/* Avatar Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="User navigation menu"
            className="touch-target p-1 rounded-full hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
              {initial}
            </div>
          </button>

          {/* Dropdown Menu Popup */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-56 rounded-2xl bg-card border border-border shadow-lg p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              {/* User Header */}
              <div className="px-3 py-2 border-b border-border/70 mb-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {profile?.email}
                </p>
                {isAdmin && (
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                    Administrator
                  </span>
                )}
              </div>

              {/* Menu Items */}
              <div className="space-y-0.5">
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/applications"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>My Applications</span>
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Profile Settings</span>
                </Link>

                <Link
                  href="/tasks"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Browse Tasks</span>
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F766E] hover:bg-[#E5EFEC]/60 transition-colors"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin Console</span>
                  </Link>
                )}
              </div>

              {/* Sign out */}
              <div className="border-t border-border/70 mt-1.5 pt-1">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
