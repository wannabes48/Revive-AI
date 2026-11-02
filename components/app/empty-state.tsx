import { LucideIcon, Sparkles } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Sparkles, title, description, action }: EmptyStateProps) {
  return (
    <div className="p-8 sm:p-12 text-center bg-card rounded-[14px] border border-border shadow-2xs space-y-3">
      <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-heading text-base font-bold text-foreground">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
