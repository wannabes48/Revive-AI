export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="pb-4 border-b border-border/70 space-y-2">
        <div className="h-8 w-56 bg-muted rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-muted/60 rounded-md" />
      </div>

      <div className="bg-card rounded-[14px] border border-border shadow-2xs p-6 space-y-5 max-w-2xl mx-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-muted/70 rounded-md" />
            <div className="h-10 w-full bg-muted/40 rounded-lg" />
          </div>
        ))}
        <div className="pt-2 flex justify-end">
          <div className="h-10 w-36 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}
