export default function AdminUserDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 animate-pulse">
      {/* Top back button skeleton */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="h-8 w-36 bg-muted rounded-full" />
        <div className="h-6 w-24 bg-muted/60 rounded-full" />
      </div>

      {/* Main Dossier Header Banner Skeleton */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted shrink-0" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-muted rounded-md" />
              <div className="h-4 w-64 bg-muted/60 rounded-md" />
              <div className="h-3 w-40 bg-muted/40 rounded-md" />
            </div>
          </div>
          <div className="w-36 h-14 bg-muted/30 rounded-xl" />
        </div>

        {/* Tab Bar Skeleton */}
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <div className="h-8 w-32 bg-muted rounded-full" />
          <div className="h-8 w-32 bg-muted/50 rounded-full" />
          <div className="h-8 w-32 bg-muted/50 rounded-full" />
          <div className="h-8 w-32 bg-muted/50 rounded-full" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-[14px] border border-border p-5 space-y-4">
          <div className="h-4 w-32 bg-muted rounded-md" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted/40 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-[14px] border border-border p-5 space-y-3">
            <div className="h-4 w-36 bg-muted rounded-md" />
            <div className="h-24 bg-muted/30 rounded-xl" />
          </div>

          <div className="bg-card rounded-[14px] border border-border p-5 space-y-3">
            <div className="h-4 w-44 bg-muted rounded-md" />
            <div className="h-16 bg-muted/30 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
