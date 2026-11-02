export default function NotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="pb-4 border-b border-border/70 space-y-2">
        <div className="h-8 w-60 bg-muted rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-muted/60 rounded-md" />
      </div>

      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden divide-y divide-border/60">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-muted rounded-md" />
                <div className="h-3 w-20 bg-muted/50 rounded-md" />
              </div>
              <div className="h-3.5 w-full bg-muted/60 rounded-md" />
              <div className="h-3.5 w-2/3 bg-muted/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
