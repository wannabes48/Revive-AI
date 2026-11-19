"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { previewItemsCsv } from "@/actions/task-wizard";
import { checkItem, itemsCsvTemplate, ITEM_COLUMNS, MAX_CSV_BYTES, type ItemRow } from "@/lib/task-wizard/csv";
import { Section, TextAreaField, TextField, type Errors } from "./fields";
import type { WizardState } from "./state";

const EMPTY: ItemRow = { case_id: "", prompt: "", response_a: "", response_b: "" };
const btn = "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:opacity-50";

export function StepItems({ state, setState, errors, taskId, rowErrors }: {
  state: WizardState;
  setState: (fn: (s: WizardState) => WizardState) => void;
  errors: Errors;
  taskId?: string;
  /** errors returned by the server on save */
  rowErrors: string[];
}) {
  const items = state.items;
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState<ItemRow>(EMPTY);
  const [manualErrors, setManualErrors] = React.useState<Record<string, string>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setUploadError("Upload a .csv file.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setUploadError("The file is larger than 4 MB. Split it into smaller files.");
      return;
    }
    setBusy(true);
    const text = await file.text();
    const res = await previewItemsCsv(text);
    setBusy(false);
    if (!res.ok) {
      setUploadError(res.error);
      return;
    }
    setState((s) => ({
      ...s,
      items: {
        ...s.items,
        // Keep the text only if it is valid: an invalid file is never sent with the save.
        csvText: res.valid ? text : "",
        csv: { fileName: file.name, valid: res.valid, total: res.total, preview: res.preview, fileErrors: res.fileErrors, rowErrors: res.rowErrors, moreErrors: res.moreErrors },
      },
    }));
  }

  function addManual() {
    const errs = Object.fromEntries(checkItem({ ...manual, case_id: manual.case_id.trim() }, 0).map((e) => [e.column!, e.message]));
    const id = manual.case_id.trim();
    const taken = items.manual.some((m) => m.case_id === id) || items.csv?.preview.some((p) => p.case_id === id);
    if (id && taken) errs.case_id = `case_id "${id}" is already used`;
    setManualErrors(errs);
    if (Object.keys(errs).length) return;
    setState((s) => ({ ...s, items: { ...s.items, manual: [...s.items.manual, { ...manual, case_id: id }] } }));
    setManual(EMPTY);
  }

  const total = (items.csv?.valid ? items.csv.total : 0) + items.manual.length;

  return (
    <div className="space-y-5">
      <Section
        id="items-csv"
        title="Cases"
        description={<>Each case is one prompt with two responses. Cases go into a new <strong>draft</strong> batch: contributors see nothing until you publish it from the task&apos;s Items page.</>}
      >
        {state.template === "single" && (
          <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            This CSV has the pairwise columns ({ITEM_COLUMNS.join(", ")}). For other payloads, use the JSON import on the task&apos;s Items page after saving.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => {
            const url = URL.createObjectURL(new Blob([itemsCsvTemplate()], { type: "text/csv" }));
            Object.assign(document.createElement("a"), { href: url, download: "cases-template.csv" }).click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </button>
          {taskId && (
            <Link href={`/admin/tasks/${taskId}/items`} className={btn}>Manage batches</Link>
          )}
        </div>

        <div
          onDragOver={(ev) => { ev.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(ev) => {
            ev.preventDefault();
            setDrag(false);
            const f = ev.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-primary bg-primary/5" : "border-border bg-muted/10"}`}
        >
          <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-foreground">Drag a CSV here</p>
          <p className="text-[11px] text-muted-foreground">Columns: {ITEM_COLUMNS.join(", ")} · up to 5,000 rows · 4 MB</p>
          <button type="button" className={`${btn} mt-3 bg-background`} disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {busy ? "Checking…" : "Choose file"}
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload cases CSV"
            onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) void handleFile(f); }} />
        </div>
        {uploadError && <p role="alert" className="text-xs font-semibold text-destructive">{uploadError}</p>}
        {errors["items.csv"] && <p role="alert" className="text-xs font-semibold text-destructive">{errors["items.csv"]}</p>}

        {items.csv && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${items.csv.valid ? "text-primary" : "text-destructive"}`} role="status">
                {items.csv.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {items.csv.fileName}: {items.csv.total.toLocaleString()} row{items.csv.total === 1 ? "" : "s"}
                {items.csv.valid ? ", all valid" : " — the whole file was rejected"}
              </p>
              <button type="button" className={btn} onClick={() => setState((s) => ({ ...s, items: { ...s.items, csv: null, csvText: "" } }))}>
                <X className="h-3.5 w-3.5" /> Remove file
              </button>
            </div>

            {(items.csv.fileErrors.length > 0 || items.csv.rowErrors.length > 0) && (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
                <p className="font-semibold text-destructive">No rows were accepted. Fix these and upload the file again:</p>
                <ul className="space-y-0.5 max-h-56 overflow-y-auto">
                  {items.csv.fileErrors.map((er) => <li key={er}>{er}</li>)}
                  {items.csv.rowErrors.map((er, i) => (
                    <li key={i}><strong>Row {er.row}</strong>{er.column ? ` (${er.column})` : ""}: {er.message}</li>
                  ))}
                  {items.csv.moreErrors > 0 && <li>…and {items.csv.moreErrors} more.</li>}
                </ul>
              </div>
            )}

            {items.csv.preview.length > 0 && (
              <div className="rounded-xl border border-border overflow-x-auto max-w-full">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <caption className="sr-only">First {items.csv.preview.length} rows of {items.csv.fileName}</caption>
                  <thead className="bg-muted/40">
                    <tr>{ITEM_COLUMNS.map((c) => <th key={c} scope="col" className="px-3 py-2 font-semibold">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {items.csv.preview.map((r, i) => (
                      <tr key={i} className="border-t border-border/60 align-top">
                        {ITEM_COLUMNS.map((c) => (
                          <td key={c} className="px-3 py-2 max-w-[18rem]"><span className="line-clamp-3 break-words whitespace-pre-wrap">{r[c] || <em className="text-destructive">empty</em>}</span></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/60">
                  Showing the first {items.csv.preview.length} of {items.csv.total.toLocaleString()} rows.
                </p>
              </div>
            )}
          </div>
        )}

        {rowErrors.length > 0 && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
            <p className="font-semibold text-destructive">The server refused the items (nothing was saved):</p>
            <ul className="space-y-0.5 max-h-48 overflow-y-auto">{rowErrors.map((er, i) => <li key={i}>{er}</li>)}</ul>
          </div>
        )}
      </Section>

      <Section id="items-manual" title="Add one case manually" description="Same four fields as the CSV.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField id="manual-case_id" label="case_id" required value={manual.case_id} error={manualErrors.case_id} maxLength={200}
            onChange={(v) => setManual({ ...manual, case_id: v })} />
          <TextAreaField id="manual-prompt" label="prompt" required rows={3} value={manual.prompt} error={manualErrors.prompt}
            className="sm:col-span-2" onChange={(v) => setManual({ ...manual, prompt: v })} />
          <TextAreaField id="manual-response_a" label="response_a" required rows={4} value={manual.response_a} error={manualErrors.response_a}
            onChange={(v) => setManual({ ...manual, response_a: v })} />
          <TextAreaField id="manual-response_b" label="response_b" required rows={4} value={manual.response_b} error={manualErrors.response_b}
            onChange={(v) => setManual({ ...manual, response_b: v })} />
        </div>
        <button type="button" onClick={addManual}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
          <Plus className="h-3.5 w-3.5" /> Add case
        </button>
        {items.manual.length > 0 && (
          <ul className="divide-y divide-border/60 rounded-xl border border-border">
            {items.manual.map((m, i) => (
              <li key={m.case_id} className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                <span className="min-w-0 text-xs"><strong className="font-mono">{m.case_id}</strong> <span className="text-muted-foreground truncate">— {m.prompt.slice(0, 80)}</span></span>
                <button type="button" aria-label={`Remove case ${m.case_id}`}
                  onClick={() => setState((s) => ({ ...s, items: { ...s.items, manual: s.items.manual.filter((_, j) => j !== i) } }))}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="items-batch" title="Batch">
        <TextField id="batch-name" label="Batch name (optional)" value={items.batchName} maxLength={120}
          help={`${total.toLocaleString()} case${total === 1 ? "" : "s"} will be added to a new draft batch when you save.`}
          onChange={(v) => setState((s) => ({ ...s, items: { ...s.items, batchName: v } }))} />
      </Section>
    </div>
  );
}
