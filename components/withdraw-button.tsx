"use client";

import * as React from "react";
import { withdrawApplication } from "@/actions/applications";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2 } from "lucide-react";

interface WithdrawButtonProps {
  applicationId: string;
  taskSlug?: string;
}

export function WithdrawButton({ applicationId, taskSlug }: WithdrawButtonProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleWithdraw() {
    if (confirm("Are you sure you want to withdraw your application from this waitlist?")) {
      setLoading(true);
      const res = await withdrawApplication(applicationId, taskSlug);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.info("Application withdrawn.");
      }
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleWithdraw}
      className="rounded-full text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors gap-1.5"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Undo2 className="h-3.5 w-3.5" />
      )}
      <span>Withdraw</span>
    </Button>
  );
}
