"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RepeaterFieldProps<T> {
  label: string;
  description?: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  addButtonLabel?: string;
}

export function RepeaterField<T>({
  label,
  description,
  items,
  onAdd,
  onRemove,
  renderItem,
  emptyMessage = "No entries added yet.",
  addButtonLabel = "Add Entry",
}: RepeaterFieldProps<T>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground">{label}</h4>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="text-xs font-semibold gap-1 h-8 rounded-full"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{addButtonLabel}</span>
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
