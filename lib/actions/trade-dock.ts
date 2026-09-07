"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  buildTradeDockItems,
  type TradeDockItem,
} from "@/lib/trade-status";

export async function loadTradeDockAction(): Promise<{
  items: TradeDockItem[];
  userId: string | null;
}> {
  const profile = await getCurrentProfile();
  if (!profile) return { items: [], userId: null };

  const supabase = await createClient();
  const [{ data: sellingOrders }, { data: buyingOrders }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, price_cents, created_at, listings(id, title, pickup_method, cover_image_path)",
      )
      .eq("seller_id", profile.id)
      .in("status", ["awaiting_dropoff", "ready_for_pickup"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("orders")
      .select(
        "id, status, price_cents, created_at, listings(id, title, pickup_method, cover_image_path)",
      )
      .eq("buyer_id", profile.id)
      .in("status", ["awaiting_dropoff", "ready_for_pickup"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    items: buildTradeDockItems({ sellingOrders, buyingOrders }),
    userId: profile.id,
  };
}
