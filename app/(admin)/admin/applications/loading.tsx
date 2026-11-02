export default function AdminApplicationsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 animate-pulse">
      {/* Page Header */}
      <div className="pb-4 border-b border-border/60 space-y-2">
        <div className="h-8 w-64 bg-muted rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-muted/60 rounded-md" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-[14px] border border-border p-4 shadow-2xs space-y-2">
            <div className="h-4 w-28 bg-muted/70 rounded-md" />
            <div className="h-8 w-14 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="h-14 bg-card rounded-[14px] border border-border p-3" />

      {/* Table Skeleton */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="h-10 bg-muted/40 border-b border-border" />
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 max-w-xs">
                <div className="h-4 w-40 bg-muted rounded-md" />
                <div className="h-3 w-48 bg-muted/50 rounded-md" />
              </div>
              <div className="h-4 w-32 bg-muted/60 rounded-md" />
              <div className="h-4 w-20 bg-muted/50 rounded-md" />
              <div className="h-5 w-12 bg-muted/70 rounded-md" />
              <div className="h-6 w-20 bg-muted/70 rounded-full" />
              <div className="h-7 w-28 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
