"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Task, WorkItem, ItemStatus } from "@/lib/supabase/types";
import { importWorkItems, deleteWorkItem, forceReleaseItem } from "@/actions/admin-work";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  Upload,
  Layers,
  CheckCircle2,
  Hourglass,
  Clock,
  Trash2,
  RefreshCw,
  Loader2,
  ArrowLeft,
  FileSpreadsheet,
  AlertCircle,
  FileCode,
  Sparkles,
} from "lucide-react";

interface WorkItemsManagerProps {
  task: Task;
  items: WorkItem[];
}

export function WorkItemsManager({ task, items: initialItems }: WorkItemsManagerProps) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [importOpen, setImportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const [importFormat, setImportFormat] = React.useState<"json" | "csv">("json");
  const [isImporting, setIsImporting] = React.useState(false);

  // Row action loaders
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [releasingId, setReleasingId] = React.useState<string | null>(null);

  // Status counters
  const counts = React.useMemo(() => {
    return {
      available: initialItems.filter((i) => i.status === "available").length,
      claimed: initialItems.filter((i) => i.status === "claimed").length,
      submitted: initialItems.filter((i) => i.status === "submitted").length,
      completed: initialItems.filter((i) => i.status === "completed").length,
      total: initialItems.length,
    };
  }, [initialItems]);

  const filteredItems = React.useMemo(() => {
    if (statusFilter === "all") return initialItems;
    return initialItems.filter((i) => i.status === statusFilter);
  }, [initialItems, statusFilter]);

  // Handle JSON or CSV Import
  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importText.trim()) {
      toast.error("Please paste or upload CSV or JSON data.");
      return;
    }

    setIsImporting(true);
    let parsedItems: Array<{ external_ref?: string; payload: Record<string, any> }> = [];

    try {
      if (importFormat === "json") {
        const raw = JSON.parse(importText);
        if (!Array.isArray(raw)) {
          throw new Error("JSON must be an array of objects.");
        }
        parsedItems = raw.map((r: any) => {
          const { external_ref, ...payload } = r;
          return {
            external_ref: external_ref ? String(external_ref) : undefined,
            payload: Object.keys(payload).length > 0 ? payload : r,
          };
        });
      } else {
        // Simple CSV parser
        const lines = importText.trim().split("\n");
        if (lines.length < 2) {
          throw new Error("CSV must have a header row and at least one data row.");
        }
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const rowObj: Record<string, any> = {};
          let extRef: string | undefined = undefined;

          headers.forEach((h, idx) => {
            if (h.toLowerCase() === "external_ref" || h.toLowerCase() === "id") {
              extRef = cols[idx];
            } else {
              rowObj[h] = cols[idx];
            }
          });

          parsedItems.push({
            external_ref: extRef,
            payload: rowObj,
          });
        }
      }
    } catch (err: any) {
      toast.error("Format error", { description: err.message });
      setIsImporting(false);
      return;
    }

    const res = await importWorkItems(task.id, parsedItems);
    setIsImporting(false);

    if (res.error) {
      toast.error("Import failed", { description: res.error });
    } else {
      toast.success("Import Complete", {
        description: `Added: ${res.added}, Skipped (duplicates): ${res.skipped}, Invalid: ${res.invalid}`,
      });
      setImportOpen(false);
      setImportText("");
      router.refresh();
    }
  }

  // Handle Delete Item
  async function handleDelete(itemId: string) {
    if (!confirm("Delete this available work item?")) return;
    setDeletingId(itemId);
    const res = await deleteWorkItem(itemId, task.id);
    setDeletingId(null);

    if (res.error) {
      toast.error("Could not delete item", { description: res.error });
    } else {
      toast.success("Work item deleted.");
      router.refresh();
    }
  }

  // Handle Force Release
  async function handleForceRelease(itemId: string) {
    if (!confirm("Force-release this item back to Available? The active claim will be cancelled.")) return;
    setReleasingId(itemId);
    const res = await forceReleaseItem(itemId, task.id);
    setReleasingId(null);

    if (res.error) {
      toast.error("Could not force-release", { description: res.error });
    } else {
      toast.success("Item released to available pool.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/tasks"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              ← Tasks
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs font-mono text-muted-foreground">/tasks/{task.slug}</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Work Items Pool: {task.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/admin/tasks/${task.id}/edit`}>
            <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold">
              Edit Task Form
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => setImportOpen(true)}
            className="rounded-full text-xs font-bold gap-1.5 h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Items</span>
          </Button>
        </div>
      </div>

      {/* 4 Metric Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Available Pool
          </span>
          <p className="font-heading font-extrabold text-2xl text-[#0F766E] mt-1">
            {counts.available}
          </p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Currently Claimed
          </span>
          <p className="font-heading font-extrabold text-2xl text-[#B45309] mt-1">
            {counts.claimed}
          </p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Submitted (In Review)
          </span>
          <p className="font-heading font-extrabold text-2xl text-primary mt-1">
            {counts.submitted}
          </p>
        </div>

        <div className="bg-card rounded-[14px] border border-border p-4 shadow-2xs">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Completed & Approved
          </span>
          <p className="font-heading font-extrabold text-2xl text-foreground mt-1">
            {counts.completed}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-[14px] border border-border shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: `All Items (${counts.total})` },
            { id: "available", label: `Available (${counts.available})` },
            { id: "claimed", label: `Claimed (${counts.claimed})` },
            { id: "submitted", label: `Submitted (${counts.submitted})` },
            { id: "completed", label: `Completed (${counts.completed})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Items Table */}
      <ResponsiveTable
        data={filteredItems}
        keyExtractor={(item) => item.id}
        emptyMessage={
          <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
            <Layers className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="font-bold text-foreground">No work items found</p>
            <p>Import CSV or JSON files to populate the pool for this task.</p>
          </div>
        }
        columns={[
          {
            header: "Item ID / External Ref",
            priority: "primary",
            cell: (item) => (
              <div>
                <span className="font-mono font-bold text-foreground block">
                  {item.id.slice(0, 8)}...
                </span>
                {item.external_ref && (
                  <span className="text-[11px] font-mono text-muted-foreground block">
                    Ref: {item.external_ref}
                  </span>
                )}
              </div>
            ),
          },
          {
            header: "Payload Preview",
            priority: "secondary",
            cell: (item) => (
              <div className="max-w-md overflow-x-auto font-mono text-[11px] text-foreground/80 bg-muted/40 p-2 rounded">
                {JSON.stringify(item.payload)}
              </div>
            ),
          },
          {
            header: "Status",
            priority: "primary",
            cell: (item) => {
              const isExpired =
                item.claim_expires_at &&
                new Date(item.claim_expires_at).getTime() < Date.now();
              return item.status === "available" ? (
                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E]">
                  Available
                </span>
              ) : item.status === "claimed" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                  Claimed {isExpired && "(Expired)"}
                </span>
              ) : item.status === "submitted" ? (
                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  In Review
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Completed
                </span>
              );
            },
          },
          {
            header: "Claimed Info",
            priority: "secondary",
            cell: (item) =>
              item.claimed_by ? (
                <div>
                  <span className="font-mono text-[10px] block text-muted-foreground">
                    User: {item.claimed_by.slice(0, 8)}...
                  </span>
                  {item.claim_expires_at && (
                    <span className="text-[10px] block text-muted-foreground">
                      Expires: {formatDateTime(item.claim_expires_at)}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            header: "Created Date",
            priority: "secondary",
            cell: (item) => (
              <span className="text-muted-foreground">{formatDate(item.created_at)}</span>
            ),
          },
          {
            header: "Actions",
            priority: "primary",
            align: "right",
            cell: (item) => {
              const isDeleting = deletingId === item.id;
              const isReleasing = releasingId === item.id;
              return (
                <div className="flex items-center justify-end gap-1.5">
                  {item.status === "claimed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isReleasing}
                      onClick={() => handleForceRelease(item.id)}
                      className="h-8 touch-target text-xs font-semibold rounded-full text-[#B45309] border-[#FDE68A] hover:bg-[#FEF3C7] gap-1"
                      title="Force release claim back to available pool"
                    >
                      {isReleasing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span>Release</span>
                    </Button>
                  )}

                  {item.status === "available" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 touch-target p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      title="Delete available item"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
      />

      {/* IMPORT ITEMS DIALOG */}
      <ResponsiveDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Work Items to Pool"
        description="Bulk import up to 5,000 units of work. Duplicates on external_ref will be skipped automatically."
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(false)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="import-items-form"
              disabled={isImporting || !importText.trim()}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-10 touch-target"
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>Import Items</span>
            </Button>
          </div>
        }
      >
        <form id="import-items-form" onSubmit={handleImportSubmit} className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportFormat("json")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer touch-target ${
                importFormat === "json"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border"
              }`}
            >
              JSON Array
            </button>
            <button
              type="button"
              onClick={() => setImportFormat("csv")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer touch-target ${
                importFormat === "csv"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border"
              }`}
            >
              CSV Table
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="import_data" className="text-xs font-semibold">
              {importFormat === "json" ? "JSON Array of Items" : "CSV Content with Headers"}
            </Label>
            <Textarea
              id="import_data"
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                importFormat === "json"
                  ? '[\n  {\n    "external_ref": "vignette_001",\n    "patient_case": "54yo female...",\n    "model_reasoning": "Suggesting chemotherapy..."\n  }\n]'
                  : "external_ref,patient_case,model_reasoning\nvignette_001,54yo female,Suggesting chemotherapy"
              }
              className="font-mono text-base sm:text-xs rounded-lg border-border bg-background"
              required
            />
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
