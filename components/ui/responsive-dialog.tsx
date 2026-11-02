"use client";

import * as React from "react";
import { X } from "lucide-react";

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: "bottom-sheet" | "full-screen";
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className = "",
  variant = "bottom-sheet",
}: ResponsiveDialogProps) {
  // Prevent background body scroll when dialog is active
  React.useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Handle ESC key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog Shell */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full bg-card border-t sm:border border-border shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85dvh] sm:rounded-2xl transition-all animate-in duration-200 ${
          variant === "full-screen"
            ? "h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[85dvh]"
            : "rounded-t-2xl sm:rounded-2xl"
        } sm:max-w-lg md:max-w-xl ${className}`}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Dialog Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-border/80 shrink-0">
          <div className="space-y-0.5 min-w-0 pr-2">
            <h2 className="font-heading text-lg font-bold text-foreground truncate">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="touch-target -mr-2 -mt-1 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Dialog Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4 overscroll-contain">
          {children}
        </div>

        {/* Sticky Action Footer */}
        {footer && (
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-5 py-3.5 pb-safe flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResponsiveDialog;
