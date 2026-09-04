"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { notifyOrderEvent } from "@/lib/notifications/dispatch";

function scheduleOrderNotify(
  orderId: string,
  event: "buy" | "dropoff" | "completed",
) {
  after(async () => {
    try {
      await notifyOrderEvent({ orderId, event });
    } catch (error) {
      console.error(`[notifyOrderEvent:${event}]`, error);
    }
  });
}

export async function buyListingAction(listingId: string) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: t.errors.loginRequired };
  }

  const { data, error } = await supabase.rpc("buy_listing", {
    p_listing_id: listingId,
  });

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message || t.errors.buyFailed,
    };
  }

  scheduleOrderNotify(data.id, "buy");

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/me");
  revalidatePath("/account/transactions");
  revalidatePath("/admin");
  return { ok: true as const, orderId: data.id as string };
}

export async function adminMarkDropoffAction(orderId: string) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_dropoff", {
    p_order_id: orderId,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message || t.errors.actionFailed };
  }
  scheduleOrderNotify(orderId, "dropoff");
  revalidatePath("/admin");
  revalidatePath("/me");
  revalidatePath("/account/transactions");
  revalidatePath("/");
  revalidatePath("/market");
  return { ok: true as const };
}

export async function adminMarkPickupAction(orderId: string) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_pickup_complete", {
    p_order_id: orderId,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message || t.errors.actionFailed };
  }
  scheduleOrderNotify(orderId, "completed");
  revalidatePath("/admin");
  revalidatePath("/me");
  revalidatePath("/account/transactions");
  revalidatePath("/account/notifications");
  revalidatePath("/");
  revalidatePath("/market");
  return { ok: true as const };
}

/** Confirm both sides finished — works from awaiting_dropoff or ready_for_pickup. */
export async function adminCompleteTradeAction(orderId: string) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_trade_complete", {
    p_order_id: orderId,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message || t.errors.actionFailed };
  }
  scheduleOrderNotify(orderId, "completed");
  revalidatePath("/admin");
  revalidatePath("/me");
  revalidatePath("/account/transactions");
  revalidatePath("/account/notifications");
  revalidatePath("/");
  revalidatePath("/market");
  return { ok: true as const };
}

export async function adminDeleteCompletedOrderAction(formData: FormData) {
  const { t } = await getI18n();
  const orderId = String(formData.get("order_id") || "").trim();
  const fail = (message: string) =>
    redirect(`/admin?tab=orders&error=${encodeURIComponent(message)}`);

  if (!orderId) {
    fail(t.errors.deleteCompletedOrderFailed);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin?tab=orders");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.status !== "completed") {
    fail(t.errors.deleteCompletedOrderFailed);
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("status", "completed");

  if (error) {
    fail(error.message || t.errors.deleteCompletedOrderFailed);
  }

  revalidatePath("/admin");
  revalidatePath("/account/transactions");
  redirect("/admin?tab=orders&orderDeleted=1");
}
