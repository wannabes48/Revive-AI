"use client";

import * as React from "react";
import { setTaskStatus } from "@/actions/tasks";
import { TaskStatus } from "@/lib/supabase/types";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Pause, Play } from "lucide-react";

interface TaskStatusToggleProps {
  taskId: string;
  currentStatus: TaskStatus;
}

export function TaskStatusToggle({ taskId, currentStatus }: TaskStatusToggleProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleToggle() {
    setLoading(true);
    const nextStatus: TaskStatus = currentStatus === "open" ? "closed" : "open";
    const res = await setTaskStatus(taskId, nextStatus);
    if (res.error) {
      toast.error(res.error);
    } else {
      if (nextStatus === "open") {
        toast.success("Task published and open for applications.");
      } else {
        toast.info("Task closed to new applications.");
      }
    }
    setLoading(false);
  }

  const isLive = currentStatus === "open";

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleToggle}
      className={`rounded-full text-xs font-semibold h-7 px-3 gap-1 transition-colors ${
        isLive
          ? "text-[#64748B] hover:text-[#DC2626] hover:bg-destructive/10"
          : "text-primary hover:bg-primary/10 border-primary/30"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isLive ? (
        <>
          <Pause className="h-3 w-3" />
          <span>Close</span>
        </>
      ) : (
        <>
          <Play className="h-3 w-3" />
          <span>Publish</span>
        </>
      )}
    </Button>
  );
}
