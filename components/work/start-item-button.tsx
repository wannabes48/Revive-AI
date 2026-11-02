"use client";

import * as React from "react";
import { startNextItem } from "@/actions/work";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Play, Loader2 } from "lucide-react";

interface StartItemButtonProps {
  taskId: string;
  slug: string;
  disabled?: boolean;
}

export function StartItemButton({
  taskId,
  slug,
  disabled,
}: StartItemButtonProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleStart() {
    setLoading(true);
    const res = await startNextItem(taskId, slug);
    setLoading(false);

    if (res?.empty) {
      toast.error("Queue Empty", {
        description: "No items available right now. Check back soon.",
      });
    } else if (res?.error) {
      toast.error("Could not claim item", {
        description: res.error,
      });
    }
  }

  return (
    <Button
      onClick={handleStart}
      disabled={loading || disabled}
      className="rounded-full text-xs font-bold gap-2 h-9 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Play className="h-3.5 w-3.5 fill-current" />
      )}
      <span>Start Next Item</span>
    </Button>
  );
}
