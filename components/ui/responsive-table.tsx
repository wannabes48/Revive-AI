"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ColumnDef<T> {
  id?: string;
  header: React.ReactNode;
  /** Primary fields show prominently in the card header on mobile */
  priority?: "primary" | "secondary" | "hidden-mobile";
  cell: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: "left" | "center" | "right";
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string | React.ReactNode;
  /** If true, renders a horizontal scrollable table with sticky first column instead of cards */
  compareMode?: boolean;
  onRowClick?: (item: T) => void;
  className?: string;
  cardClassName?: string;
  /** Custom mobile card renderer if a screen needs bespoke card anatomy */
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  /** Whether secondary fields are initially expanded on mobile */
  defaultExpandedMobile?: boolean;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No items to display.",
  compareMode = false,
  onRowClick,
  className = "",
  cardClassName = "",
  renderMobileCard,
  defaultExpandedMobile = false,
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = React.useState<Record<string | number, boolean>>({});

  const toggleRow = (key: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-[14px] bg-card border border-border text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  // Horizontal scroll table with sticky first column (compare mode)
  if (compareMode) {
    return (
      <div className={`w-full overflow-x-auto rounded-[14px] border border-border bg-card shadow-2xs ${className}`}>
        <table className="w-full min-w-[640px] text-left text-sm border-collapse">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.id || idx}
                  className={`py-3.5 px-4 font-semibold ${idx === 0 ? "sticky left-0 bg-muted/80 backdrop-blur-xs z-10 shadow-[1px_0_0_0_hsl(var(--border))]" : ""} ${col.headerClassName || ""} ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.map((item, rowIdx) => {
              const key = keyExtractor(item, rowIdx);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  className={`transition-colors hover:bg-muted/30 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.id || colIdx}
                      className={`py-3.5 px-4 text-foreground ${
                        colIdx === 0 ? "sticky left-0 bg-card z-10 font-medium shadow-[1px_0_0_0_hsl(var(--border))]" : ""
                      } ${col.className || ""} ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.cell(item, rowIdx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const primaryColumns = columns.filter((c) => c.priority === "primary" || !c.priority);
  const secondaryColumns = columns.filter((c) => c.priority === "secondary");

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {/* ================= MOBILE VIEW (< md): STACKED CARDS ================= */}
      <div className="md:hidden space-y-3">
        {data.map((item, rowIdx) => {
          const key = keyExtractor(item, rowIdx);
          const isExpanded = expandedRows[key] ?? defaultExpandedMobile;

          if (renderMobileCard) {
            return (
              <div key={key} onClick={() => onRowClick?.(item)}>
                {renderMobileCard(item, rowIdx)}
              </div>
            );
          }

          return (
            <div
              key={key}
              onClick={() => onRowClick?.(item)}
              className={`rounded-[14px] border border-border bg-card p-4 shadow-2xs space-y-3 transition-colors ${
                onRowClick ? "cursor-pointer active:bg-muted/30" : ""
              } ${cardClassName}`}
            >
              {/* Primary Key Fields */}
              <div className="space-y-2">
                {primaryColumns.map((col, idx) => (
                  <div key={col.id || idx} className="flex items-start justify-between gap-3 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">
                      {col.header}
                    </span>
                    <div className="text-sm font-medium text-foreground text-right break-words min-w-0">
                      {col.cell(item, rowIdx)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Secondary Fields (Collapsible Accordion) */}
              {secondaryColumns.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  {isExpanded && (
                    <div className="space-y-2 pb-2 pt-1 animate-in fade-in-0 duration-150">
                      {secondaryColumns.map((col, idx) => (
                        <div key={col.id || idx} className="flex items-start justify-between gap-3 min-w-0">
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0 mt-0.5">
                            {col.header}
                          </span>
                          <div className="text-xs text-foreground/90 text-right break-words min-w-0">
                            {col.cell(item, rowIdx)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => toggleRow(key, e)}
                    aria-expanded={isExpanded}
                    className="touch-target w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
                  >
                    <span>{isExpanded ? "Hide Details" : "Show Details"}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= DESKTOP VIEW (>= md): SEMANTIC TABLE ================= */}
      <div className="hidden md:block overflow-x-auto rounded-[14px] border border-border bg-card shadow-2xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.id || idx}
                  className={`py-3.5 px-4 font-semibold ${col.headerClassName || ""} ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.map((item, rowIdx) => {
              const key = keyExtractor(item, rowIdx);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  className={`transition-colors hover:bg-muted/20 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.id || colIdx}
                      className={`py-3.5 px-4 text-foreground break-words ${col.className || ""} ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.cell(item, rowIdx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsiveTable;
