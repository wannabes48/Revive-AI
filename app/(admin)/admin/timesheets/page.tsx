import { redirect } from "next/navigation";

// Self-logged timesheets were replaced by the server work clock.
export default function AdminTimesheetsPage() {
  redirect("/admin/live");
}
