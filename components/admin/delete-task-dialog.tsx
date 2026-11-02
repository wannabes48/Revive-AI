"use client";

import * as React from "react";
import { deleteTask } from "@/actions/tasks";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteTaskDialogProps {
  taskId: string;
  taskTitle: string;
}

export function DeleteTaskDialog({ taskId, taskTitle }: DeleteTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await deleteTask(taskId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Task deleted.");
    }
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title="Delete task"
        onClick={() => setOpen(true)}
        className="rounded-full h-8 w-8 touch-target p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${taskTitle}?`}
        description="Deleting this task will immediately and permanently erase all associated contributor applications and waitlist positions from the database."
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Keep Task
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={handleDelete}
              className="rounded-full text-xs font-semibold gap-1.5 h-10 touch-target"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>Confirm Deletion</span>
            </Button>
          </div>
        }
      >
        <div className="py-2 text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Warning:</strong> Deleting this task cannot be undone. All contributor applications, waitlist rankings, and submissions associated with this task will be removed.
          </p>
          <p className="italic">
            Tip: If you simply want to stop accepting new applicants, consider changing the task status to <strong>Closed</strong> instead of deleting it.
          </p>
        </div>
      </ResponsiveDialog>
    </>
  );
}
