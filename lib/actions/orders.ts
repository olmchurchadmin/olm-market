"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyOrderEvent } from "@/lib/notifications/dispatch";

export async function buyListingAction(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase.rpc("buy_listing", {
    p_listing_id: listingId,
  });

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message || "구매에 실패했습니다.",
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_dropoff", {
    p_order_id: orderId,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message || "처리 실패" };
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_pickup_complete", {
    p_order_id: orderId,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message || "처리 실패" };
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
