export default function ApplicationsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
      {/* Header & Metrics Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-muted rounded-full" />
          <div className="h-9 w-64 bg-muted rounded-xl" />
          <div className="h-4 w-80 max-w-full bg-muted/70 rounded-md" />
        </div>

        <div className="grid grid-cols-4 gap-2 bg-card p-2 rounded-[14px] border border-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-18 bg-muted/40 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Applications Table Skeleton */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        <div className="h-10 bg-muted/30 border-b border-border" />
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1 max-w-md">
                <div className="h-5 w-3/4 bg-muted rounded-md" />
                <div className="h-4 w-1/2 bg-muted/60 rounded-md" />
              </div>
              <div className="h-5 w-20 bg-muted/50 rounded-md" />
              <div className="h-6 w-24 bg-muted/70 rounded-full" />
              <div className="h-6 w-20 bg-muted/70 rounded-full" />
              <div className="h-8 w-24 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
