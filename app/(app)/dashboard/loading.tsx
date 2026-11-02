export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/70">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded-xl" />
            <div className="h-4 w-48 bg-muted/60 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-muted rounded-full" />
          <div className="h-8 w-24 bg-muted rounded-full" />
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-2">
            <div className="h-4 w-32 bg-muted/60 rounded-md" />
            <div className="h-8 w-16 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-56 bg-muted rounded-md" />
          <div className="bg-card rounded-[14px] border border-border shadow-2xs p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-[14px] border border-border shadow-2xs p-5 space-y-3">
            <div className="h-5 w-32 bg-muted rounded-md" />
            <div className="h-20 bg-muted/40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
