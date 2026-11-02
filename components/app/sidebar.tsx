"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole, Profile } from "@/lib/supabase/types";
import { signOutAction } from "@/actions/auth";
import {
  LayoutDashboard,
  Compass,
  FileText,
  User,
  Shield,
  Sparkles,
  LogOut,
  ChevronRight,
  Briefcase,
  Wallet,
} from "lucide-react";

interface SidebarProps {
  role?: UserRole;
  profile?: Profile | null;
}

export function Sidebar({ role, profile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
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
      label: "Earnings",
      href: "/earnings",
      icon: Wallet,
      isActive: pathname.startsWith("/earnings"),
    },
    {
      label: "Applications",
      href: "/applications",
      icon: FileText,
      isActive: pathname.startsWith("/applications"),
    },
    {
      label: "Browse tasks",
      href: "/tasks",
      icon: Compass,
      isActive: pathname.startsWith("/tasks"),
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
      isActive: pathname.startsWith("/profile"),
    },
  ];

  if (role === "admin") {
    navItems.push({
      label: "Admin",
      href: "/admin",
      icon: Shield,
      isActive: pathname.startsWith("/admin"),
    });
  }

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Contributor";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 bg-card border-r border-border z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/70">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs group-hover:scale-105 transition-transform duration-150">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-extrabold text-lg tracking-tight text-foreground">
              Revive<span className="text-primary">AI</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                active
                  ? "bg-[#E5EFEC] text-[#0F766E] shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active ? "text-[#0F766E]" : "text-muted-foreground"
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.label === "Admin" && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#0F766E]/10 text-[#0F766E]">
                  Pro
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Profile Chip Footer */}
      <div className="p-3 border-t border-border/70">
        <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2.5 group">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
            title="Edit profile"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {role === "admin" ? "Administrator" : "Contributor"}
              </p>
            </div>
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
