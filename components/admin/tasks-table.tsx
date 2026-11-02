"use client";

import * as React from "react";
import Link from "next/link";
import { Task } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { TaskStatusToggle } from "@/components/admin/task-status-toggle";
import { DeleteTaskDialog } from "@/components/admin/delete-task-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import { Button } from "@/components/ui/button";
import {
  Users,
  Edit2,
  ExternalLink,
  ArrowRight,
  Layers,
  Plus,
} from "lucide-react";

export interface TaskWithCount extends Task {
  applications?: { count: number }[];
}

interface TasksTableProps {
  tasks: TaskWithCount[];
}

export function TasksTable({ tasks }: TasksTableProps) {
  const columns: ColumnDef<TaskWithCount>[] = [
    {
      header: "Task Details",
      priority: "primary",
      cell: (task) => (
        <div className="max-w-sm">
          <div className="flex items-start gap-2">
            <div>
              <Link
                href={`/admin/tasks/${task.id}/waitlist`}
                className="font-heading font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
              >
                {task.title}
              </Link>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {task.summary}
              </p>
            </div>
            <Link
              href={`/tasks/${task.slug}`}
              target="_blank"
              title="View public page"
              className="text-muted-foreground hover:text-primary transition-colors p-1 touch-target shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ),
    },
    {
      header: "Domain",
      priority: "secondary",
      cell: (task) => (
        <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border border-border/80">
          {task.category}
        </span>
      ),
    },
    {
      header: "Slots & Applicants",
      priority: "secondary",
      cell: (task) => {
        const applicantCount = task.applications?.[0]?.count || 0;
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{applicantCount}</span>
            <span className="text-muted-foreground">/ {task.slots || "∞"} slots</span>
          </div>
        );
      },
    },
    {
      header: "Status",
      priority: "primary",
      cell: (task) => <StatusBadge status={task.status} />,
    },
    {
      header: "Created",
      priority: "secondary",
      cell: (task) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(task.created_at)}
        </span>
      ),
    },
    {
      header: "Actions",
      priority: "primary",
      align: "right",
      cell: (task) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {/* Work Items Pool Button */}
          <Link href={`/admin/tasks/${task.id}/items`}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold h-8 touch-target px-2.5 gap-1 hover:border-primary/40 hover:text-primary"
              title="Manage work items pool"
            >
              <Layers className="h-3 w-3" />
              <span>Items</span>
            </Button>
          </Link>

          {/* Waitlist Button */}
          <Link href={`/admin/tasks/${task.id}/waitlist`}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold h-8 touch-target px-3 gap-1 hover:border-primary/40 hover:text-primary"
            >
              <span>Waitlist</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>

          {/* Publish/Close Toggle */}
          <TaskStatusToggle taskId={task.id} currentStatus={task.status} />

          {/* Edit Button */}
          <Link href={`/admin/tasks/${task.id}/edit`}>
            <Button
              variant="ghost"
              size="sm"
              title="Edit task settings"
              className="rounded-full h-8 w-8 touch-target p-0 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </Link>

          {/* Delete Dialog */}
          <DeleteTaskDialog taskId={task.id} taskTitle={task.title} />
        </div>
      ),
    },
  ];

  return (
    <ResponsiveTable
      data={tasks}
      keyExtractor={(task) => task.id}
      columns={columns}
      emptyMessage={
        <div className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-base font-bold text-foreground">
            No tasks created yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create your first task opportunity to begin accepting qualified specialist applications and waitlists.
          </p>
          <div className="pt-2">
            <Link href="/admin/tasks/new">
              <Button size="sm" className="rounded-full text-xs font-semibold gap-1.5 h-10 touch-target">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Task</span>
              </Button>
            </Link>
          </div>
        </div>
      }
    />
  );
}
