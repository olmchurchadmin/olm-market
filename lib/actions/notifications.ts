"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserAlertsData } from "@/lib/user-alerts";

const TRADE_TYPES = ["order_reserved", "order_at_church", "order_completed"] as const;

export async function loadUserAlertsAction() {
  return getUserAlertsData();
}

export async function markNotificationsReadAction(ids: string[]) {
  const uniqueIds = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  if (!uniqueIds.length) return { ok: true as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const now = new Date().toISOString();

  // Prefer service role so mark-as-read is not silently filtered by RLS.
  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .in("id", uniqueIds)
      .is("read_at", null)
      .select("id");

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, updated: data?.length ?? 0 };
  } catch {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .in("id", uniqueIds)
      .is("read_at", null)
      .select("id");

    if (error) return { ok: false as const, error: error.message };
    if (!data?.length) {
      return {
        ok: false as const,
        error: "Could not mark notification as read",
      };
    }
    return { ok: true as const, updated: data.length };
  }
}

export async function markAllTradeNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Unauthorized" };

  const now = new Date().toISOString();

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null)
      .in("type", [...TRADE_TYPES])
      .select("id");

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, updated: data?.length ?? 0 };
  } catch {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null)
      .in("type", [...TRADE_TYPES])
      .select("id");

    if (error) return { ok: false as const, error: error.message };
    if (!data?.length) {
      // Already clear is fine for "mark all".
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
        .in("type", [...TRADE_TYPES]);
      if ((count || 0) === 0) return { ok: true as const, updated: 0 };
      return {
        ok: false as const,
        error: "Could not mark notifications as read",
      };
    }
    return { ok: true as const, updated: data.length };
  }
}
