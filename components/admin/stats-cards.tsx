import {
  Briefcase,
  Hourglass,
  CheckCircle2,
  Users,
  FileSpreadsheet,
  ArrowUpRight,
} from "lucide-react";

interface StatsCardsProps {
  openTasksCount: number;
  totalApplicationsCount: number;
  waitlistedCount: number;
  approvedCount: number;
  usersCount: number;
}

export function StatsCards({
  openTasksCount,
  totalApplicationsCount,
  waitlistedCount,
  approvedCount,
  usersCount,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Open Tasks */}
      <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs hover:border-primary/50 transition-colors flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Open Tasks
            </span>
            <h3 className="font-heading text-2xl font-extrabold text-foreground mt-1">
              {openTasksCount}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Briefcase className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-3 mt-2 border-t border-border/60">
          Accepting new applicants
        </p>
      </div>

      {/* 2. Total Applications */}
      <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs hover:border-primary/50 transition-colors flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Applications
            </span>
            <h3 className="font-heading text-2xl font-extrabold text-foreground mt-1">
              {totalApplicationsCount}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-3 mt-2 border-t border-border/60">
          Across all active tasks
        </p>
      </div>

      {/* 3. Waitlisted (Pending Review) - Amber Alert */}
      <div className="bg-card rounded-[14px] border border-[#FDE68A] p-4 shadow-2xs bg-gradient-to-br from-card to-[#FEF3C7]/20 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#78350F] uppercase tracking-wider">
                Pending Review
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#B45309] animate-pulse" />
            </div>
            <h3 className="font-heading text-2xl font-extrabold text-[#78350F] mt-1">
              {waitlistedCount}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#78350F] flex items-center justify-center">
            <Hourglass className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] text-[#78350F]/90 pt-3 mt-2 border-t border-[#FDE68A]/60 font-medium">
          Awaiting admin calibration
        </p>
      </div>

      {/* 4. Approved Specialists */}
      <div className="bg-card rounded-[14px] border border-[#99F6E4] p-4 shadow-2xs bg-gradient-to-br from-card to-[#CCFBF1]/20 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wider">
              Approved
            </span>
            <h3 className="font-heading text-2xl font-extrabold text-[#0F766E] mt-1">
              {approvedCount}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] text-[#0F766E]/80 pt-3 mt-2 border-t border-[#99F6E4]/60 font-medium">
          Qualified into cohorts
        </p>
      </div>

      {/* 5. Registered Users */}
      <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs hover:border-primary/50 transition-colors flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Users
            </span>
            <h3 className="font-heading text-2xl font-extrabold text-foreground mt-1">
              {usersCount}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-3 mt-2 border-t border-border/60">
          Domain specialists
        </p>
      </div>
    </div>
  );
}
