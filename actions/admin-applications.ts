"use server";

import {
  setApplicationStatus as setStatus,
  bulkSetApplicationStatus as bulkSetStatus,
  moveApplication as moveApp,
  type ApplicationActionResult,
} from "./applications";
import { ApplicationStatus } from "@/lib/supabase/types";

export type AdminAppActionResult = ApplicationActionResult;

export async function setApplicationStatus(
  id: string,
  status: "approved" | "rejected" | "waitlisted" | "withdrawn",
  adminNote?: string
) {
  return await setStatus(id, status, adminNote);
}

export async function bulkSetApplicationStatus(
  ids: string[],
  status: ApplicationStatus,
  adminNote?: string
) {
  return await bulkSetStatus(ids, status, adminNote);
}

export async function moveApplication(id: string, direction: "up" | "down") {
  return await moveApp(id, direction);
}
