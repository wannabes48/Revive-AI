"use server";

import { createClient } from "@/lib/supabase/server";

export async function getApplicationDetail(id: string) {
  const supabase = await createClient();
  const [{ data: app }, { data: events }, { data: rank }] = await Promise.all([
    supabase
      .from("applications")
      .select("*, task:tasks(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("application_events")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: true }),
    supabase.rpc("my_waitlist_rank", { p_application_id: id }),
  ]);

  return {
    app,
    events: events ?? [],
    rank: rank?.[0] ?? null,
  };
}
