export const RESUME_BUCKET = "resumes";
export const RESUME_MAX_BYTES = 4 * 1024 * 1024; // keep under Vercel's 4.5 MB request limit
export const RESUME_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ResumeType = { mime: string; extension: "pdf" | "doc" | "docx" };

/** Identifies the file by its leading bytes, not the name the browser reports. */
export function detectResumeType(bytes: Uint8Array, name: string): ResumeType | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const ext = name.toLowerCase().split(".").pop();

  if (starts([0x25, 0x50, 0x44, 0x46])) return { mime: "application/pdf", extension: "pdf" }; // %PDF
  if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && ext === "doc") {
    return { mime: "application/msword", extension: "doc" };
  }
  if (starts([0x50, 0x4b, 0x03, 0x04]) && ext === "docx") {
    return {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
    };
  }
  return null;
}

export function safeResumeFilename(name: string, extension: string): string {
  const base = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "resume"}.${extension}`;
}
