"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Task, TaskStatus, PayModel } from "@/lib/supabase/types";
import { Field } from "@/lib/item-schema";
import { createTask, updateTask } from "@/actions/tasks";
import { slugify, formatCents } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Save,
  Code2,
  Eye,
  FileCode,
  FileText,
  DollarSign,
  Clock,
  Layers,
} from "lucide-react";

interface TaskFormProps {
  task?: Task;
  isEdit?: boolean;
}

const DEFAULT_STARTER_SCHEMA: Field[] = [
  {
    id: "accuracy_rating",
    type: "rating",
    label: "Reasoning Accuracy",
    help: "Rate the accuracy from 1 (completely wrong) to 5 (flawless)",
    min: 1,
    max: 5,
    required: true,
  },
  {
    id: "clinical_category",
    type: "select",
    label: "Error Classification",
    help: "Select primary clinical failure mode",
    options: ["None / Accurate", "Diagnostic Miss", "Dosage Error", "Contraindication", "Other"],
    required: true,
  },
  {
    id: "has_harm_potential",
    type: "boolean",
    label: "Patient Harm Risk",
    help: "Does this output carry significant harm potential?",
    required: true,
  },
  {
    id: "evaluation_critique",
    type: "text",
    label: "Clinical Critique & Rationalization",
    help: "Explain your rating and correct the model reasoning",
    minLength: 20,
    maxLength: 3000,
    required: true,
  },
];

export function TaskForm({ task, isEdit }: TaskFormProps) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState(task?.title || "");
  const [slug, setSlug] = React.useState(task?.slug || "");
  const [slugTouched, setSlugTouched] = React.useState(isEdit || false);

  const [status, setStatus] = React.useState<TaskStatus>(task?.status || "open");
  const [payModel, setPayModel] = React.useState<PayModel>(task?.pay_model || "per_item");

  const [rateDollars, setRateDollars] = React.useState<string>(
    task?.rate_cents != null ? (task.rate_cents / 100).toFixed(2) : "4.50"
  );
  const [budgetDollars, setBudgetDollars] = React.useState<string>(
    task?.budget_cents != null ? (task.budget_cents / 100).toFixed(2) : ""
  );

  // Instructions & Markdown preview toggle
  const [instructions, setInstructions] = React.useState(task?.instructions || "");
  const [previewInstructions, setPreviewInstructions] = React.useState(false);

  // Answer Form JSON editor state
  const initialSchemaJson = React.useMemo(() => {
    if (task?.item_schema && Array.isArray(task.item_schema) && task.item_schema.length > 0) {
      return JSON.stringify(task.item_schema, null, 2);
    }
    return JSON.stringify(DEFAULT_STARTER_SCHEMA, null, 2);
  }, [task]);

  const [schemaText, setSchemaText] = React.useState(initialSchemaJson);
  const [parsedSchema, setParsedSchema] = React.useState<Field[]>(() => {
    try {
      return JSON.parse(initialSchemaJson);
    } catch {
      return DEFAULT_STARTER_SCHEMA;
    }
  });
  const [schemaError, setSchemaError] = React.useState<string | null>(null);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slugTouched) {
      setSlug(slugify(newTitle));
    }
  }

  function handleSchemaChange(text: string) {
    setSchemaText(text);
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setSchemaError("item_schema must be a JSON array of field objects.");
      } else {
        setParsedSchema(parsed);
        setSchemaError(null);
      }
    } catch (e: any) {
      setSchemaError("Invalid JSON syntax: " + e.message);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (schemaError) {
      toast.error("Please fix the item_schema JSON before saving.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("item_schema", schemaText);

    let result;
    if (isEdit && task) {
      result = await updateTask(task.id, formData);
    } else {
      result = await createTask(formData);
    }

    if (result.error) {
      setErrorMessage(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success(isEdit ? "Task updated successfully." : "Task created successfully.");
      router.push("/admin/tasks");
    }
  }

  const isWarningVisible = status === "open" && (!parsedSchema || parsedSchema.length === 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Warning Banner: Open Task without schema */}
      {isWarningVisible && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#78350F] text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#B45309]" />
          <div>
            <span className="font-bold block text-sm">Action Needed: Empty Answer Form</span>
            <span>
              This task is set to <strong>Open</strong>, but its answer form is empty. Contributors will not be able to evaluate work items until you configure fields in the Answer Form Editor below.
            </span>
          </div>
        </div>
      )}

      {/* Primary Details Card */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <h3 className="font-heading text-base font-bold text-foreground">
          Task Identity & Category
        </h3>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs font-semibold text-foreground">
            Task Title *
          </Label>
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={handleTitleChange}
            placeholder="e.g. Clinical Diagnostic Reasoning & Oncology Vignettes"
            className="rounded-lg h-10 border-border"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="slug" className="text-xs font-semibold text-foreground">
              URL Slug *
            </Label>
            <span className="text-[11px] text-muted-foreground">
              /tasks/{slug || "slug-preview"}
            </span>
          </div>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugTouched(true);
            }}
            placeholder="e.g. clinical-diagnostic-reasoning-oncology"
            className="rounded-lg h-10 border-border font-mono text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs font-semibold text-foreground">
              Specialty Category *
            </Label>
            <input
              id="category"
              name="category"
              required
              defaultValue={task?.category || CATEGORIES[0]}
              list="category-options"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <datalist id="category-options">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-xs font-semibold text-foreground">
              Publishing State *
            </Label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="draft">Draft (Hidden from public directory)</option>
              <option value="open">Open (Publicly accepting waitlist)</option>
              <option value="closed">Closed (Archived)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasking & Pay Model Card */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Task Execution & Pay Model
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure how contributors claim items, log work, and get paid into their wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pay_model" className="text-xs font-semibold text-foreground">
              Pay Model *
            </Label>
            <select
              id="pay_model"
              name="pay_model"
              value={payModel}
              onChange={(e) => setPayModel(e.target.value as PayModel)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="per_item">Per Approved Item (Item Pool)</option>
              <option value="hourly">Hourly Timesheet (Time Logging)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate" className="text-xs font-semibold text-foreground">
              {payModel === "hourly" ? "Hourly Rate (USD) *" : "Pay Per Item (USD) *"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                $
              </span>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                required
                value={rateDollars}
                onChange={(e) => setRateDollars(e.target.value)}
                placeholder="4.50"
                className="pl-7 rounded-lg h-10 border-border font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-xs font-semibold text-foreground">
              Task Budget Cap (USD, Optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                $
              </span>
              <Input
                id="budget"
                name="budget"
                type="number"
                step="1"
                min="0"
                value={budgetDollars}
                onChange={(e) => setBudgetDollars(e.target.value)}
                placeholder="5000"
                className="pl-7 rounded-lg h-10 border-border font-mono"
              />
            </div>
          </div>
        </div>

        {payModel === "per_item" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label htmlFor="claim_minutes" className="text-xs font-semibold text-foreground">
                Item Claim Duration (Minutes) *
              </Label>
              <Input
                id="claim_minutes"
                name="claim_minutes"
                type="number"
                min="5"
                max="1440"
                required
                defaultValue={task?.claim_minutes ?? 60}
                className="rounded-lg h-10 border-border"
              />
              <span className="text-[10px] text-muted-foreground block">
                How long a contributor holds an item before it expires and returns to the pool.
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_open_claims" className="text-xs font-semibold text-foreground">
                Max Open Claims per Contributor *
              </Label>
              <Input
                id="max_open_claims"
                name="max_open_claims"
                type="number"
                min="1"
                max="10"
                required
                defaultValue={task?.max_open_claims ?? 1}
                className="rounded-lg h-10 border-border"
              />
              <span className="text-[10px] text-muted-foreground block">
                Limits how many items one contributor can hold simultaneously (default 1).
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Card */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Contributor Instructions & Rubrics
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Markdown rendered directly on the work screen and slide-over instructions drawer.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewInstructions(!previewInstructions)}
            className="rounded-full text-xs font-semibold gap-1.5 h-8"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{previewInstructions ? "Edit Markdown" : "Live Preview"}</span>
          </Button>
        </div>

        {previewInstructions ? (
          <div className="p-4 rounded-xl bg-muted/20 border border-border text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed min-h-[160px]">
            {instructions || "No instructions provided yet."}
          </div>
        ) : (
          <Textarea
            id="instructions"
            name="instructions"
            rows={6}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="# Instructions for Annotators&#10;&#10;1. Carefully inspect the prompt...&#10;2. Check against ICD-10 guidelines...&#10;3. Submit feedback."
            className="rounded-lg border-border font-mono text-xs leading-relaxed"
          />
        )}
      </div>

      {/* Answer Form Editor & Live Preview Card */}
      {payModel === "per_item" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Answer Form Definition (item_schema)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defines the interactive response form shown to contributors and reviewers. Valid field types: <code>rating</code>, <code>select</code>, <code>multiselect</code>, <code>boolean</code>, <code>text</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* JSON Code Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                  JSON Schema
                </span>
                <button
                  type="button"
                  onClick={() => handleSchemaChange(JSON.stringify(DEFAULT_STARTER_SCHEMA, null, 2))}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Load Starter Template
                </button>
              </div>

              <Textarea
                rows={16}
                value={schemaText}
                onChange={(e) => handleSchemaChange(e.target.value)}
                className="font-mono text-xs rounded-lg border-border bg-muted/20 leading-relaxed"
              />

              {schemaError ? (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono">
                  {schemaError}
                </div>
              ) : (
                <div className="text-[11px] text-[#0F766E] flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Valid schema: {parsedSchema.length} fields configured</span>
                </div>
              )}
            </div>

            {/* Live Form Preview */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Live Contributor Form Preview
              </span>

              <div className="p-4 rounded-xl border border-border bg-background space-y-4 max-h-[380px] overflow-y-auto shadow-inner">
                {parsedSchema.map((f, i) => (
                  <div key={f.id || i} className="space-y-1.5 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {f.label || `Field ${i + 1}`} {f.required !== false && <span className="text-destructive">*</span>}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                        {f.type}
                      </span>
                    </div>

                    {f.help && <p className="text-[10px] text-muted-foreground italic">{f.help}</p>}

                    {f.type === "rating" && (
                      <div className="flex items-center gap-1 pt-1">
                        {Array.from({ length: (f.max || 5) - (f.min || 1) + 1 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-7 rounded-lg border border-border bg-muted/20 flex items-center justify-center text-xs font-bold text-muted-foreground"
                          >
                            {(f.min || 1) + idx}
                          </div>
                        ))}
                      </div>
                    )}

                    {f.type === "select" && (
                      <div className="h-8 rounded-md border border-input bg-muted/20 px-2 flex items-center text-xs text-muted-foreground">
                        Select from {(f.options || []).length} options...
                      </div>
                    )}

                    {f.type === "multiselect" && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(f.options || ["Option A", "Option B"]).map((opt) => (
                          <span key={opt} className="px-2 py-0.5 rounded-full border border-border text-[10px] bg-muted/20 text-muted-foreground">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {f.type === "boolean" && (
                      <div className="flex gap-2 pt-1">
                        <div className="flex-1 py-1 text-center rounded border border-border text-xs font-bold text-muted-foreground">
                          Yes
                        </div>
                        <div className="flex-1 py-1 text-center rounded border border-border text-xs font-bold text-muted-foreground">
                          No
                        </div>
                      </div>
                    )}

                    {f.type === "text" && (
                      <div className="h-12 rounded-md border border-input bg-muted/20 p-2 text-xs text-muted-foreground italic">
                        Textarea input ({f.minLength || 0} to {f.maxLength || 4000} characters)...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scope & Description Card */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
        <h3 className="font-heading text-base font-bold text-foreground">
          Public Directory Summary & Details
        </h3>

        <div className="space-y-2">
          <Label htmlFor="summary" className="text-xs font-semibold text-foreground">
            Executive Summary / Short Brief *
          </Label>
          <Input
            id="summary"
            name="summary"
            required
            defaultValue={task?.summary || ""}
            placeholder="Brief 1-2 sentence overview for task cards..."
            className="rounded-lg h-10 border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs font-semibold text-foreground">
            Public Detailed Description *
          </Label>
          <Textarea
            id="description"
            name="description"
            required
            rows={5}
            defaultValue={task?.description || ""}
            placeholder="Outline task background and public overview..."
            className="rounded-lg border-border font-sans text-sm leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pay_min" className="text-xs font-semibold text-foreground">
              Display Pay Min (USD) *
            </Label>
            <Input
              id="pay_min"
              name="pay_min"
              type="number"
              min="0"
              required
              defaultValue={task?.pay_min ?? 65}
              className="rounded-lg h-10 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay_max" className="text-xs font-semibold text-foreground">
              Display Pay Max (USD) *
            </Label>
            <Input
              id="pay_max"
              name="pay_max"
              type="number"
              min="0"
              required
              defaultValue={task?.pay_max ?? 95}
              className="rounded-lg h-10 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay_unit" className="text-xs font-semibold text-foreground">
              Display Pay Unit *
            </Label>
            <select
              id="pay_unit"
              name="pay_unit"
              defaultValue={task?.pay_unit || "hour"}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="hour">Per Hour (/hr)</option>
              <option value="task">Per Task</option>
              <option value="milestone">Per Benchmark Milestone</option>
              <option value="project">Fixed Project Total</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="commitment" className="text-xs font-semibold text-foreground">
              Weekly Commitment *
            </Label>
            <Input
              id="commitment"
              name="commitment"
              required
              defaultValue={task?.commitment || "10-15 hrs/wk"}
              className="rounded-lg h-10 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-xs font-semibold text-foreground">
              Location *
            </Label>
            <Input
              id="location"
              name="location"
              required
              defaultValue={task?.location || "Remote"}
              className="rounded-lg h-10 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slots" className="text-xs font-semibold text-foreground">
              Target Cohort Slots *
            </Label>
            <Input
              id="slots"
              name="slots"
              type="number"
              min="1"
              required
              defaultValue={task?.slots ?? 10}
              className="rounded-lg h-10 border-border"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="sticky bottom-0 inset-x-0 z-20 -mx-4 -mb-6 sm:mx-0 sm:mb-0 p-4 sm:p-0 bg-card/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-border pb-safe flex items-center justify-between">
        <Link href="/admin/tasks">
          <Button type="button" variant="outline" className="rounded-full text-xs font-semibold gap-1.5 h-11 min-h-[44px] touch-target">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={loading || Boolean(schemaError)}
          className="rounded-full text-xs font-semibold px-6 shadow-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-11 min-h-[44px] touch-target"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>{isEdit ? "Update Task" : "Publish Task"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
