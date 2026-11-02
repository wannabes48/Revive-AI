"use client";

import * as React from "react";
import Link from "next/link";
import { ApplicationStatus } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  Search,
  ArrowRight,
  User,
  Briefcase,
  MapPin,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";

export interface FullApplicationRow {
  id: string;
  task_id: string;
  user_id: string;
  status: ApplicationStatus;
  note: string | null;
  position: number | null;
  admin_note: string | null;
  created_at: string;
  tasks: {
    id: string;
    title: string;
    slug: string;
    category: string;
    status: string;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    expertise: string | null;
    country: string | null;
  } | null;
}

interface AllApplicationsTableProps {
  applications: FullApplicationRow[];
}

export function AllApplicationsTable({ applications }: AllApplicationsTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [viewNoteApp, setViewNoteApp] = React.useState<FullApplicationRow | null>(null);

  // Extract unique categories from tasks
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    applications.forEach((a) => {
      if (a.tasks?.category) cats.add(a.tasks.category);
    });
    return Array.from(cats);
  }, [applications]);

  // Filter applications
  const filteredApps = React.useMemo(() => {
    return applications.filter((app) => {
      const profile = app.profiles;
      const task = app.tasks;

      const matchesStatus =
        selectedStatus === "all" ? true : app.status === selectedStatus;
      const matchesCategory =
        selectedCategory === "all" ? true : task?.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        profile?.full_name?.toLowerCase().includes(q) ||
        profile?.email?.toLowerCase().includes(q) ||
        profile?.expertise?.toLowerCase().includes(q) ||
        task?.title?.toLowerCase().includes(q) ||
        app.note?.toLowerCase().includes(q);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [applications, selectedStatus, selectedCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-[14px] border border-border shadow-2xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Statuses" },
            { id: "waitlisted", label: "Waitlisted" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "withdrawn", label: "Withdrawn" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Domain Select */}
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by task category"
              className="text-xs h-8 px-3 rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Domains</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search candidate, email, or task"
              placeholder="Search candidate or task..."
              className="pl-9 h-8 text-xs rounded-full border-border bg-background"
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <ResponsiveTable
        data={filteredApps}
        keyExtractor={(app) => app.id}
        emptyMessage={
          <div className="space-y-2 py-4">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-heading font-bold text-foreground">
              No matching applications
            </h4>
            <p className="text-xs text-muted-foreground">
              {applications.length === 0
                ? "No contributors have applied yet."
                : "No applications matched the search criteria."}
            </p>
          </div>
        }
        columns={[
          {
            header: "Candidate",
            priority: "primary",
            cell: (app) => {
              const profile = app.profiles;
              const candidateName =
                profile?.full_name || profile?.email?.split("@")[0] || "Unknown User";
              return (
                <div className="max-w-xs">
                  <div className="font-semibold text-foreground leading-tight">
                    {candidateName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {profile?.email}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    {profile?.expertise && (
                      <span className="font-medium text-foreground/80">
                        {profile.expertise}
                      </span>
                    )}
                    {profile?.country && <span>• {profile.country}</span>}
                  </div>
                </div>
              );
            },
          },
          {
            header: "Applied Task",
            priority: "primary",
            cell: (app) => {
              const task = app.tasks;
              return task ? (
                <div>
                  <Link
                    href={`/admin/tasks/${task.id}/waitlist`}
                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">{task.category}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Archived Task</span>
              );
            },
          },
          {
            header: "Submitted",
            priority: "secondary",
            cell: (app) => (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(app.created_at)}
              </span>
            ),
          },
          {
            header: "Queue Pos",
            priority: "secondary",
            cell: (app) => (
              <span className="text-xs whitespace-nowrap">
                {app.status === "waitlisted" && app.position != null ? (
                  <span className="font-bold text-[#78350F]">#{app.position}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            ),
          },
          {
            header: "Status",
            priority: "primary",
            cell: (app) => <StatusBadge status={app.status} />,
          },
          {
            header: "Brief",
            priority: "secondary",
            cell: (app) =>
              app.note ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewNoteApp(app)}
                  className="rounded-full h-8 touch-target px-2.5 text-xs text-primary gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>View Note</span>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground italic">—</span>
              ),
          },
          {
            header: "Waitlist Action",
            priority: "primary",
            align: "right",
            cell: (app) => {
              const task = app.tasks;
              return task ? (
                <Link href={`/admin/tasks/${task.id}/waitlist`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs font-semibold h-8 touch-target px-3 gap-1 hover:border-primary/40 hover:text-primary"
                  >
                    <span>Manage Waitlist</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              ) : null;
            },
          },
        ]}
      />

      {/* View Brief Dialog */}
      <ResponsiveDialog
        open={Boolean(viewNoteApp)}
        onOpenChange={(open) => !open && setViewNoteApp(null)}
        title={viewNoteApp?.profiles?.full_name || viewNoteApp?.profiles?.email || "Candidate Application"}
        description={`Applied to: ${viewNoteApp?.tasks?.title || "Task"}`}
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewNoteApp(null)}
            className="rounded-full text-xs h-10 touch-target w-full sm:w-auto"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3 py-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Submitted Cover Brief
            </span>
            <p className="text-xs text-foreground mt-1 whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border">
              {viewNoteApp?.note || "No note provided."}
            </p>
          </div>

          {viewNoteApp?.admin_note && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                Admin Internal Note
              </span>
              <p className="text-xs text-foreground mt-1 whitespace-pre-wrap bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                {viewNoteApp.admin_note}
              </p>
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
