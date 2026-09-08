"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function toggleWatchlistAction(listingId: string) {
  const { t } = await getI18n();
  const id = String(listingId || "").trim();
  if (!id) {
    return { ok: false as const, error: t.errors.listingNotFound };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: t.errors.loginRequired };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!listing || listing.status === "cancelled") {
    return { ok: false as const, error: t.errors.listingNotFound };
  }

  if (listing.seller_id === user.id) {
    return { ok: false as const, error: t.errors.watchlistOwnListing };
  }

  const { data: existing } = await supabase
    .from("watchlist")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", id);
    if (error) {
      return { ok: false as const, error: error.message || t.errors.actionFailed };
    }
    revalidatePath("/account/watchlist");
    revalidatePath(`/market/${id}`);
    return { ok: true as const, watched: false };
  }

  const { error } = await supabase.from("watchlist").insert({
    user_id: user.id,
    listing_id: id,
  });
  if (error) {
    return { ok: false as const, error: error.message || t.errors.actionFailed };
  }

  revalidatePath("/account/watchlist");
  revalidatePath(`/market/${id}`);
  return { ok: true as const, watched: true };
}

export async function removeFromWatchlistAction(listingId: string) {
  const { t } = await getI18n();
  const id = String(listingId || "").trim();
  if (!id) {
    return { ok: false as const, error: t.errors.listingNotFound };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: t.errors.loginRequired };
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", id);

  if (error) {
    return { ok: false as const, error: error.message || t.errors.actionFailed };
  }

  revalidatePath("/account/watchlist");
  revalidatePath(`/market/${id}`);
  return { ok: true as const };
}
