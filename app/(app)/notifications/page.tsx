import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Notification } from "@/lib/supabase/types";
import { NotificationsList } from "@/components/app/notifications-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notificationsData } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const notifications = (notificationsData as Notification[]) || [];

  return <NotificationsList initialNotifications={notifications} />;
}
