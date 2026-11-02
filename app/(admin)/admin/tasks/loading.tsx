export default function AdminTasksLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-muted rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-muted/60 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-full" />
      </div>

      {/* 4 Metrics Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-[14px] border border-border p-4 shadow-2xs space-y-2">
            <div className="h-4 w-20 bg-muted/70 rounded-md" />
            <div className="h-8 w-12 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="h-11 bg-muted/40 border-b border-border" />
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 max-w-sm">
                <div className="h-5 w-4/5 bg-muted rounded-md" />
                <div className="h-3.5 w-3/5 bg-muted/50 rounded-md" />
              </div>
              <div className="h-6 w-28 bg-muted/50 rounded-full" />
              <div className="h-5 w-20 bg-muted/60 rounded-md" />
              <div className="h-6 w-16 bg-muted/70 rounded-full" />
              <div className="h-4 w-20 bg-muted/50 rounded-md" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-20 bg-muted rounded-full" />
                <div className="h-7 w-16 bg-muted rounded-full" />
                <div className="h-7 w-7 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
