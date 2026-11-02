export default function WaitlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="space-y-3 pb-4 border-b border-border/60">
        <div className="h-7 w-28 bg-muted rounded-full" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-80 bg-muted rounded-xl" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-64 bg-muted/60 rounded-md" />
      </div>

      {/* 3 Quota Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-3">
            <div className="h-4 w-32 bg-muted/70 rounded-md" />
            <div className="h-9 w-20 bg-muted rounded-lg" />
            <div className="h-2 w-full bg-muted/40 rounded-full" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="h-14 bg-card rounded-[14px] border border-border p-3" />

      {/* Table Skeleton */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="h-10 bg-muted/40 border-b border-border" />
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="h-4 w-4 bg-muted/50 rounded" />
              <div className="h-5 w-8 bg-muted rounded-md" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <div className="h-4 w-32 bg-muted rounded-md" />
                <div className="h-3 w-40 bg-muted/50 rounded-md" />
              </div>
              <div className="h-4 w-24 bg-muted/60 rounded-md" />
              <div className="h-4 w-36 bg-muted/50 rounded-md" />
              <div className="h-6 w-20 bg-muted/70 rounded-full" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 bg-muted rounded-full" />
                <div className="h-7 w-16 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
