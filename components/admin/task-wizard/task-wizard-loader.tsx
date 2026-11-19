"use client";

// The wizard renders in the browser only, so it can restore autosaved work from localStorage
// in its first render (no flash of empty fields, no hydration mismatch).
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const TaskWizardLoader = dynamic(() => import("./task-wizard").then((m) => m.TaskWizard), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex items-center gap-2 rounded-[14px] border border-border bg-card p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading the task builder…
    </div>
  ),
});
