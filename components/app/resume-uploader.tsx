"use client";

import * as React from "react";
import { FileText, Loader2, Upload, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { RESUME_ACCEPT, RESUME_MAX_BYTES } from "@/lib/resume";

interface ResumeUploaderProps {
  filename: string | null;
  uploadedAt: string | null;
  onUploaded: (info: { filename: string; uploadedAt: string }) => void;
}

export function ResumeUploader({ filename, uploadedAt, onUploaded }: ResumeUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > RESUME_MAX_BYTES) {
      toast.error("Your resume must be 4 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/profile/resume", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Upload failed. Please try again.");
        return;
      }
      onUploaded({ filename: data.filename, uploadedAt: data.uploadedAt });
      toast.success("Resume uploaded");
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
        filename ? "border-border bg-background" : "border-dashed border-amber-500/50 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            filename ? "bg-primary/10 text-primary" : "bg-amber-500/15 text-amber-700"
          }`}
        >
          {filename ? <FileText className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          {filename ? (
            <>
              <a
                href="/api/profile/resume"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-foreground hover:text-primary inline-flex items-center gap-1 max-w-full"
              >
                <span className="truncate">{filename}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <p className="text-[11px] text-muted-foreground">
                {uploadedAt ? `Uploaded ${new Date(uploadedAt).toLocaleDateString()}` : "Uploaded"}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">No resume uploaded yet</p>
              <p className="text-[11px] text-muted-foreground">
                Required. PDF or Word document, up to 4 MB. Only Revive AI staff can see it.
              </p>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={RESUME_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center justify-center gap-1.5 h-10 min-h-[44px] px-4 rounded-full text-xs font-bold border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-60 cursor-pointer shrink-0"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        <span>{uploading ? "Uploading…" : filename ? "Replace resume" : "Upload resume"}</span>
      </button>
    </div>
  );
}
