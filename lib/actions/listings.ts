"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

async function requireSeller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/account/transactions");
  }
  return { supabase, user };
}

async function parseListingFields(formData: FormData) {
  const { t } = await getI18n();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const categoryId = String(formData.get("category_id") || "");
  const priceDollars = Number(formData.get("price") || 0);
  const pickupRaw = String(formData.get("pickup_method") || "church");
  const pickupMethod =
    pickupRaw === "seller_location" ? "seller_location" : "church";
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!title || !categoryId || Number.isNaN(priceDollars) || priceDollars < 0) {
    throw new Error(t.errors.requiredFields);
  }

  return {
    title,
    description,
    categoryId,
    priceCents: Math.round(priceDollars * 100),
    pickupMethod,
    files,
  };
}

async function uploadListingImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  listingId: string,
  files: File[],
  startOrder = 0,
) {
  const uploadedPaths: string[] = [];
  for (let i = 0; i < Math.min(files.length, 6); i += 1) {
    const file = files[i];
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${userId}/${listingId}/${startOrder + i}-${crypto.randomUUID()}.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
    if (!uploadError) {
      uploadedPaths.push(path);
      await supabase.from("listing_images").insert({
        listing_id: listingId,
        storage_path: path,
        sort_order: startOrder + i,
      });
    }
  }
  return uploadedPaths;
}

export async function createListingAction(formData: FormData) {
  const { supabase, user } = await requireSeller();
  const { title, description, categoryId, priceCents, pickupMethod, files } =
    await parseListingFields(formData);

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      category_id: categoryId,
      title,
      description,
      price_cents: priceCents,
      pickup_method: pickupMethod,
      status: "available",
    })
    .select("id")
    .single();

  if (error || !listing) {
    const { t } = await getI18n();
    throw new Error(error?.message || t.errors.createFailed);
  }

  const uploadedPaths = await uploadListingImages(
    supabase,
    user.id,
    listing.id,
    files,
  );

  if (uploadedPaths[0]) {
    await supabase
      .from("listings")
      .update({ cover_image_path: uploadedPaths[0] })
      .eq("id", listing.id);
  }

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath("/account/transactions");
  revalidatePath("/me");
  redirect(`/market/${listing.id}`);
}

export async function updateListingAction(formData: FormData) {
  const { supabase, user } = await requireSeller();
  const { t } = await getI18n();
  const listingId = String(formData.get("listing_id") || "");
  if (!listingId) throw new Error(t.errors.listingNotFound);

  const { title, description, categoryId, priceCents, pickupMethod, files } =
    await parseListingFields(formData);

  const { data: existing, error: loadError } = await supabase
    .from("listings")
    .select("id, seller_id, status, cover_image_path")
    .eq("id", listingId)
    .maybeSingle();

  if (loadError || !existing || existing.seller_id !== user.id) {
    throw new Error(t.errors.cannotEdit);
  }
  if (existing.status !== "available" && existing.status !== "cancelled") {
    throw new Error(t.errors.cannotEditActive);
  }

  const { error } = await supabase
    .from("listings")
    .update({
      category_id: categoryId,
      title,
      description,
      price_cents: priceCents,
      pickup_method: pickupMethod,
      status: "available",
    })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) {
    throw new Error(error.message || t.errors.updateFailed);
  }

  const removeIds = formData
    .getAll("remove_image_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (removeIds.length) {
    const { data: toRemove } = await supabase
      .from("listing_images")
      .select("id, storage_path")
      .eq("listing_id", listingId)
      .in("id", removeIds);

    const paths = (toRemove || []).map((row) => row.storage_path);
    if (paths.length) {
      await supabase.storage.from("listing-images").remove(paths);
    }
    await supabase
      .from("listing_images")
      .delete()
      .eq("listing_id", listingId)
      .in("id", removeIds);
  }

  const { data: remaining } = await supabase
    .from("listing_images")
    .select("id, storage_path, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  const startOrder = remaining?.length ? remaining.length : 0;
  const slots = Math.max(0, 6 - startOrder);
  const uploadedPaths = await uploadListingImages(
    supabase,
    user.id,
    listingId,
    files.slice(0, slots),
    startOrder,
  );

  const cover =
    remaining?.[0]?.storage_path ||
    uploadedPaths[0] ||
    null;

  await supabase
    .from("listings")
    .update({ cover_image_path: cover })
    .eq("id", listingId);

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/account/transactions");
  revalidatePath("/me");
  redirect(`/market/${listingId}`);
}

export async function deleteListingAction(formData: FormData) {
  const { supabase, user } = await requireSeller();
  const { t } = await getI18n();
  const listingId = String(formData.get("listing_id") || "");
  if (!listingId) {
    redirect("/account/transactions?error=missing");
  }

  const { data: existing } = await supabase
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!existing || existing.seller_id !== user.id) {
    redirect(
      `/account/transactions?error=${encodeURIComponent(t.errors.cannotDelete)}`,
    );
  }

  if (
    existing.status === "reserved" ||
    existing.status === "at_church" ||
    existing.status === "sold"
  ) {
    redirect(
      `/account/transactions?error=${encodeURIComponent(t.errors.cannotDeleteActive)}`,
    );
  }

  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  const paths = (images || []).map((row) => row.storage_path);
  if (paths.length) {
    await supabase.storage.from("listing-images").remove(paths);
  }

  // Soft-cancel first (works with existing update RLS even without DELETE policy)
  const { error: cancelError } = await supabase
    .from("listings")
    .update({ status: "cancelled", cover_image_path: null })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (cancelError) {
    redirect(
      `/account/transactions?error=${encodeURIComponent(cancelError.message || t.errors.deleteFailed)}`,
    );
  }

  await supabase.from("listing_images").delete().eq("listing_id", listingId);

  // Best-effort hard delete when policy/FK allow it
  await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id);

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/account/transactions");
  revalidatePath("/me");
  redirect("/account/transactions?deleted=1");
}
