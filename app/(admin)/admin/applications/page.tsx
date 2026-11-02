import { requireAdmin } from "@/lib/auth";
import {
  AllApplicationsTable,
  FullApplicationRow,
} from "@/components/admin/all-applications-table";
import { FileSpreadsheet, Hourglass, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const { supabase } = await requireAdmin();

  const { data: appsData, error } = await supabase
    .from("applications")
    .select(`
      id,
      task_id,
      user_id,
      status,
      note,
      position,
      admin_note,
      created_at,
      tasks (
        id,
        title,
        slug,
        category,
        status
      ),
      profiles (
        id,
        full_name,
        email,
        expertise,
        country
      )
    `)
    .order("created_at", { ascending: false });

  const applications = (appsData || []) as unknown as FullApplicationRow[];

  const totalCount = applications.length;
  const waitlistedCount = applications.filter((a) => a.status === "waitlisted").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-border/60">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Global Applications Directory
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Cross-task audit log of all specialist applications, active waitlists, and qualification outcomes.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Applications</span>
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-foreground">{totalCount}</p>
        </div>
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#B45309] mb-1">
            <span className="text-xs font-medium">Waitlisted</span>
            <Hourglass className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[#B45309]">{waitlistedCount}</p>
        </div>
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#0F766E] mb-1">
            <span className="text-xs font-medium">Approved</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[#0F766E]">{approvedCount}</p>
        </div>
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#DC2626] mb-1">
            <span className="text-xs font-medium">Rejected</span>
            <XCircle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-heading font-extrabold text-[#DC2626]">{rejectedCount}</p>
        </div>
      </div>

      {/* Table Component */}
      <AllApplicationsTable applications={applications} />
    </div>
  );
}
