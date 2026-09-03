"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { notifyPickupDetails } from "@/lib/notifications/dispatch";
import { createClient } from "@/lib/supabase/server";

/**
 * Home-pickup trades need the seller's address to reach the buyer. Rather than
 * a full chat thread, the seller sends it once and both sides plus the admin
 * get a notification carrying the text.
 */
export async function sharePickupDetailsAction(input: {
  orderId: string;
  note: string;
  contact: string;
}) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: t.errors.loginRequired };

  const note = input.note.trim();
  const contact = input.contact.trim();
  if (!note) return { ok: false as const, error: t.errors.pickupNoteRequired };

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, seller_id, status, listings(pickup_method)")
    .eq("id", input.orderId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false as const, error: t.errors.pickupShareFailed };
  }
  if (order.seller_id !== user.id) {
    return { ok: false as const, error: t.errors.pickupNotAllowed };
  }
  if (order.status !== "awaiting_dropoff" && order.status !== "ready_for_pickup") {
    return { ok: false as const, error: t.errors.pickupNotAllowed };
  }

  const listing = Array.isArray(order.listings) ? order.listings[0] : order.listings;
  if (listing?.pickup_method !== "seller_location") {
    return { ok: false as const, error: t.errors.pickupNotAllowed };
  }

  after(async () => {
    try {
      await notifyPickupDetails({ orderId: order.id, note, contact });
    } catch (err) {
      console.error("[notifyPickupDetails]", err);
    }
  });

  revalidatePath("/account/transactions");
  revalidatePath("/account/notifications");
  return { ok: true as const };
}
