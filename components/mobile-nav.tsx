"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Briefcase,
  Layers,
  HelpCircle,
  FileText,
  User,
  LayoutDashboard,
  Shield,
  LogOut,
  Sparkles,
} from "lucide-react";

interface MobileNavProps {
  user: { id: string; email?: string } | null;
  isAdmin: boolean;
}

export function MobileNav({ user, isAdmin }: MobileNavProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  return (
    <div className="md:hidden flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close main menu" : "Open main menu"}
        aria-expanded={isOpen}
        className="touch-target rounded-full text-foreground/80 hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && mounted && createPortal(
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full bg-card text-card-foreground border-b border-border shadow-2xl max-h-[88dvh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4 pb-safe">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
                    Revive<span className="text-primary">AI</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close menu"
                  className="touch-target p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Primary Navigation Links */}
              <nav className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                Explore Platform
              </span>
              <Link
                href="/tasks"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors"
              >
                <Briefcase className="h-4 w-4 text-primary" />
                <span>Task Directory</span>
              </Link>
              <Link
                href="/#how-it-works"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>How It Works</span>
              </Link>
              <Link
                href="/#categories"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span>Domains & Specialties</span>
              </Link>
              <Link
                href="/#faq"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                <span>FAQ</span>
              </Link>
            </nav>

            <div className="border-t border-border/80 pt-3">
              {user ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1 block">
                    Account & Submissions
                  </span>

                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <span>Contributor Dashboard</span>
                  </Link>

                  <Link
                    href="/applications"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted hover:text-primary transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span>My Applications</span>
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#0F766E] bg-[#E5EFEC]/60 hover:bg-[#E5EFEC] transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Command Center</span>
                    </Link>
                  )}

                  <div className="pt-2 px-3">
                    <form action={signOutAction}>
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        className="w-full rounded-full text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1.5"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign out</span>
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1 px-1">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block"
                  >
                    <Button
                      variant="outline"
                      className="w-full rounded-full text-xs font-semibold"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="block"
                  >
                    <Button className="w-full rounded-full text-xs font-semibold shadow-xs">
                      Sign up as Specialist
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </div>
  );
}
