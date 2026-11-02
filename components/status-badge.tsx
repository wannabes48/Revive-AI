import * as React from "react";
import { cn } from "@/lib/utils";

export type ApplicationStatus = "waitlisted" | "approved" | "rejected" | "withdrawn";
export type TaskStatus = "open" | "closed" | "draft";

export type StatusBadgeType = ApplicationStatus | TaskStatus | string;

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusBadgeType;
  label?: string;
  pulsing?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot?: string }
> = {
  waitlisted: {
    label: "Waitlisted",
    bg: "bg-[#FEF3C7]",
    text: "text-[#78350F]",
    border: "border-[#FDE68A]",
    dot: "bg-[#B45309]",
  },
  approved: {
    label: "Approved",
    bg: "bg-[#CCFBF1]",
    text: "text-[#0F766E]",
    border: "border-[#99F6E4]",
    dot: "bg-[#0F766E]",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-[#FEE2E2]",
    text: "text-[#B91C1C]",
    border: "border-[#FECACA]",
    dot: "bg-[#DC2626]",
  },
  withdrawn: {
    label: "Withdrawn",
    bg: "bg-[#F1F5F9]",
    text: "text-[#64748B]",
    border: "border-[#CBD5E1]",
    dot: "bg-[#94A3B8]",
  },
  open: {
    label: "Open Task",
    bg: "bg-[#D1FAE5]",
    text: "text-[#065F46]",
    border: "border-[#A7F3D0]",
    dot: "bg-[#059669]",
  },
  closed: {
    label: "Closed",
    bg: "bg-[#F1F5F9]",
    text: "text-[#64748B]",
    border: "border-[#CBD5E1]",
    dot: "bg-[#94A3B8]",
  },
  draft: {
    label: "Draft",
    bg: "bg-[#E5EFEC]",
    text: "text-[#5B7773]",
    border: "border-[#D3E2DE]",
    dot: "bg-[#5B7773]",
  },
};

export function StatusBadge({
  status,
  label,
  pulsing,
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const config = statusConfig[normalizedStatus] || {
    label: status,
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  };

  const displayLabel = label || config.label;
  const showPulse = pulsing !== undefined ? pulsing : normalizedStatus === "open" || normalizedStatus === "waitlisted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors shadow-2xs select-none",
        config.bg,
        config.text,
        config.border,
        className
      )}
      {...props}
    >
      {config.dot && (
        <span className="relative flex h-2 w-2">
          {showPulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                config.dot
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              config.dot
            )}
          />
        </span>
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
