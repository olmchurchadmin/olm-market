"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { notifyOrderEvent } from "@/lib/notifications/dispatch";

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

  try {
    await notifyOrderEvent({ orderId: data.id, event: "buy" });
  } catch {
    // Order already reserved; notification failure should not roll back.
  }

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
  try {
    await notifyOrderEvent({ orderId, event: "dropoff" });
  } catch {
    // ignore
  }
  revalidatePath("/admin");
  revalidatePath("/me");
  revalidatePath("/account/transactions");
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
  try {
    await notifyOrderEvent({ orderId, event: "completed" });
  } catch {
    // ignore
  }
  revalidatePath("/admin");
  revalidatePath("/me");
  revalidatePath("/account/transactions");
  revalidatePath("/market");
  return { ok: true as const };
}
