import Link from "next/link";
import { Hourglass, CheckCircle2, XCircle, FileText } from "lucide-react";

interface StatCardProps {
  label: string;
  count: number;
  sublabel: string;
  statusParam?: "waitlisted" | "approved" | "rejected" | "all";
  type: "waitlisted" | "approved" | "rejected" | "total";
}

export function StatCard({ label, count, sublabel, statusParam = "all", type }: StatCardProps) {
  const href = statusParam === "all" ? "/applications" : `/applications?status=${statusParam}`;

  const config = {
    waitlisted: {
      icon: Hourglass,
      color: "text-[#78350F]",
      borderHover: "hover:border-[#FDE68A]",
    },
    approved: {
      icon: CheckCircle2,
      color: "text-[#0F766E]",
      borderHover: "hover:border-[#99F6E4]",
    },
    rejected: {
      icon: XCircle,
      color: "text-[#B91C1C]",
      borderHover: "hover:border-[#FECACA]",
    },
    total: {
      icon: FileText,
      color: "text-foreground",
      borderHover: "hover:border-primary/40",
    },
  }[type];

  const Icon = config.icon;

  return (
    <Link
      href={href}
      className={`bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-2xs ${config.borderHover} transition-all group block`}
    >
      <div className={`flex items-center justify-between ${config.color} mb-1.5`}>
        <span className="text-xs font-semibold">{label}</span>
        <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl sm:text-3xl font-heading font-black ${config.color}`}>
          {count}
        </span>
        <span className="text-[11px] text-muted-foreground">{sublabel}</span>
      </div>
    </Link>
  );
}
