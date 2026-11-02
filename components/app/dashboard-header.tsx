import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

interface DashboardHeaderProps {
  fullName?: string | null;
  email?: string | null;
}

export function DashboardHeader({ fullName, email }: DashboardHeaderProps) {
  // Extract first name
  const firstName = fullName?.trim().split(" ")[0] || email?.split("@")[0] || "Contributor";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Review your qualification standing, explore matching opportunities, and track admissions.
        </p>
      </div>

      <Link href="/tasks">
        <Button className="rounded-full text-xs font-bold gap-2 shadow-2xs h-9 px-5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Browse tasks</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
