import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { TaskForm } from "@/components/admin/task-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  await requireAdmin();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-3 pb-4 border-b border-border/60">
        <Link href="/admin/tasks">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 -ml-2 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Tasks</span>
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Create New Task
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Specify technical qualifications, compensation parameters, and contributor intake quotas.
            </p>
          </div>
        </div>
      </div>

      {/* Task Creation Form */}
      <TaskForm />
    </div>
  );
}
