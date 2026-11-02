export default function TasksLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
      {/* Title & Stats Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded-full" />
          <div className="h-9 w-72 bg-muted rounded-xl" />
          <div className="h-4 w-96 max-w-full bg-muted/70 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-muted rounded-full" />
      </div>

      {/* Filter Controls Skeleton */}
      <div className="space-y-4">
        <div className="h-11 w-full bg-muted/60 rounded-xl" />
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[80, 140, 110, 130, 120, 100].map((width, idx) => (
            <div
              key={idx}
              className="h-8 rounded-full bg-muted/50 shrink-0"
              style={{ width: `${width}px` }}
            />
          ))}
        </div>
      </div>

      {/* Task Cards Grid Skeleton (6 items) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-muted rounded-full" />
              <div className="h-5 w-16 bg-muted/60 rounded-full" />
            </div>

            <div className="space-y-2">
              <div className="h-6 w-5/6 bg-muted rounded-md" />
              <div className="h-4 w-full bg-muted/60 rounded-md" />
              <div className="h-4 w-4/6 bg-muted/60 rounded-md" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-8 bg-muted/40 rounded-lg" />
              <div className="h-8 bg-muted/40 rounded-lg" />
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <div className="h-5 w-24 bg-muted rounded-md" />
              <div className="h-8 w-20 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
