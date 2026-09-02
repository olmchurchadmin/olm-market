"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserAlertsData } from "@/lib/user-alerts";

export async function loadUserAlertsAction() {
  return getUserAlertsData();
}

export async function markNotificationsReadAction(ids: string[]) {
  if (!ids.length) return { ok: true as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("id", ids)
    .is("read_at", null);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
