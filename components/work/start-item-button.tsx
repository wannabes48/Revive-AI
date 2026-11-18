"use client";

import * as React from "react";
import { startWorking } from "@/actions/work";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Play, Loader2 } from "lucide-react";

interface StartItemButtonProps {
  taskId: string;
  slug: string;
  hourly?: boolean;
  resuming?: boolean;
  disabled?: boolean;
}

/**
 * Per-item tasks: claims a random next task.
 * Hourly tasks: starts (or resumes) the server work clock, then claims a task.
 */
export function StartItemButton({ taskId, slug, hourly = false, resuming = false, disabled }: StartItemButtonProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleStart() {
    setLoading(true);
    const res = await startWorking(taskId, slug, hourly);
    setLoading(false);

    if (res?.empty) {
      toast.error("No tasks right now", {
        description: hourly
          ? "The queue is empty, so the clock was not started. Check back soon."
          : "No tasks available right now. Check back soon.",
      });
    } else if (res?.error) {
      toast.error(hourly ? "Could not start working" : "Could not start the next task", {
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
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
      <span>{hourly ? (resuming ? "Resume working" : "Start working") : "Start Next Task"}</span>
    </Button>
  );
}
