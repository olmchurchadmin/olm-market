"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserAlertsData, TRADE_TYPES } from "@/lib/user-alerts";

export async function loadUserAlertsAction() {
  return getUserAlertsData();
}

type MarkResult =
  | { ok: true; updated: number; data: Awaited<ReturnType<typeof getUserAlertsData>> }
  | { ok: false; error: string };

/**
 * Falls back to a direct update when the RPC is not deployed yet. The service
 * role bypasses RLS, so an empty result here means the rows genuinely were not
 * the caller's or were already read.
 */
async function markDirect(userId: string, ids: string[] | null) {
  const now = new Date().toISOString();
  const client = (() => {
    try {
      return createServiceClient();
    } catch {
      return null;
    }
  })();

  const supabase = client ?? (await createClient());
  let query = supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);

  query = ids ? query.in("id", ids) : query.in("type", [...TRADE_TYPES]);

  const { data, error } = await query.select("id");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, updated: data?.length ?? 0 };
}

async function markRead(ids: string[] | null): Promise<MarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const rpc = ids
    ? await supabase.rpc("mark_notifications_read", { p_ids: ids })
    : await supabase.rpc("mark_all_notifications_read", {
        p_types: [...TRADE_TYPES],
      });

  let updated = typeof rpc.data === "number" ? rpc.data : 0;

  if (rpc.error) {
    const fallback = await markDirect(user.id, ids);
    if (!fallback.ok) return { ok: false, error: fallback.error };
    updated = fallback.updated;
  }

  // Server truth, so the caller never has to re-fetch and race itself.
  const data = await getUserAlertsData();

  // A write that changed nothing while the rows are still unread is the silent
  // failure this whole path exists to prevent — report it instead of letting
  // the badge quietly reappear.
  const stillUnread = (data?.notifications || []).filter(
    (n) => !n.readAt && (!ids || ids.includes(n.id)),
  );
  if (stillUnread.length) {
    return {
      ok: false,
      error: `Mark-as-read did not persist (${stillUnread.length} still unread)`,
    };
  }

  return { ok: true, updated, data };
}

export async function markNotificationsReadAction(
  ids: string[],
): Promise<MarkResult> {
  const uniqueIds = [
    ...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
  ];
  if (!uniqueIds.length) {
    return { ok: true, updated: 0, data: await getUserAlertsData() };
  }
  return markRead(uniqueIds);
}

export async function markAllTradeNotificationsReadAction(): Promise<MarkResult> {
  return markRead(null);
}

type DeleteResult =
  | { ok: true; data: Awaited<ReturnType<typeof getUserAlertsData>> }
  | { ok: false; error: string };

export async function deleteNotificationsAction(
  ids: string[],
): Promise<DeleteResult> {
  const uniqueIds = [
    ...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
  ];
  if (!uniqueIds.length) {
    return { ok: true, data: await getUserAlertsData() };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Try RPC first, fall back to direct delete.
  const rpc = await supabase.rpc("delete_notifications", { p_ids: uniqueIds });
  if (rpc.error) {
    // Fallback: direct delete via user client (needs DELETE policy).
    const client = (() => {
      try {
        return createServiceClient();
      } catch {
        return null;
      }
    })();
    const db = client ?? supabase;
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .in("id", uniqueIds);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, data: await getUserAlertsData() };
}
