"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { notifyListingCreated, notifyAdminListingChange } from "@/lib/notifications/dispatch";
import { createClient } from "@/lib/supabase/server";
import type { PickupMethod } from "@/lib/types";

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
  const donationRaw = Number(formData.get("donation_percent") || 100);
  const donationPercent = Math.min(
    100,
    Math.max(30, Math.round(Number.isFinite(donationRaw) ? donationRaw : 100)),
  );
  const pickupRaw = String(formData.get("pickup_method") || "church");
  const pickupMethod: PickupMethod =
    pickupRaw === "seller_location" ? "seller_location" : "church";
  const pickupAddress = String(formData.get("pickup_address") || "").trim();
  const pickupPhone = String(formData.get("pickup_phone") || "").trim();
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!title || !categoryId || Number.isNaN(priceDollars) || priceDollars < 0) {
    throw new Error(t.errors.requiredFields);
  }
  if (pickupMethod === "seller_location" && (!pickupAddress || !pickupPhone)) {
    throw new Error(t.errors.pickupContactRequired);
  }

  return {
    title,
    description,
    categoryId,
    priceCents: Math.round(priceDollars * 100),
    donationPercent,
    pickupMethod,
    pickupAddress,
    pickupPhone,
    files,
  };
}

async function upsertPickupContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  pickupMethod: PickupMethod,
  address: string,
  phone: string,
) {
  if (pickupMethod === "seller_location") {
    const { error } = await supabase.from("listing_pickup_contacts").upsert(
      {
        listing_id: listingId,
        address,
        phone,
      },
      { onConflict: "listing_id" },
    );
    if (error) throw new Error(error.message);
    return;
  }

  await supabase
    .from("listing_pickup_contacts")
    .delete()
    .eq("listing_id", listingId);
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
  const {
    title,
    description,
    categoryId,
    priceCents,
    donationPercent,
    pickupMethod,
    pickupAddress,
    pickupPhone,
    files,
  } = await parseListingFields(formData);

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      category_id: categoryId,
      title,
      description,
      price_cents: priceCents,
      donation_percent: donationPercent,
      pickup_method: pickupMethod,
      status: "available",
    })
    .select("id")
    .single();

  if (error || !listing) {
    const { t } = await getI18n();
    throw new Error(error?.message || t.errors.createFailed);
  }

  try {
    await upsertPickupContacts(
      supabase,
      listing.id,
      pickupMethod,
      pickupAddress,
      pickupPhone,
    );
  } catch (contactError) {
    await supabase.from("listings").delete().eq("id", listing.id);
    throw contactError;
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

  after(async () => {
    try {
      await notifyListingCreated(listing.id);
    } catch (error) {
      console.error("[notifyListingCreated]", error);
    }
  });

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

  const {
    title,
    description,
    categoryId,
    priceCents,
    donationPercent,
    pickupMethod,
    pickupAddress,
    pickupPhone,
    files,
  } = await parseListingFields(formData);

  const [{ data: existing, error: loadError }, { data: profile }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, seller_id, status, cover_image_path")
        .eq("id", listingId)
        .maybeSingle(),
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);

  const isAdmin = profile?.role === "admin";
  if (loadError || !existing || (existing.seller_id !== user.id && !isAdmin)) {
    throw new Error(t.errors.cannotEdit);
  }
  if (
    !isAdmin &&
    existing.status !== "available" &&
    existing.status !== "cancelled"
  ) {
    throw new Error(t.errors.cannotEditActive);
  }

  let updateQuery = supabase
    .from("listings")
    .update({
      category_id: categoryId,
      title,
      description,
      price_cents: priceCents,
      donation_percent: donationPercent,
      pickup_method: pickupMethod,
      // Admins can patch active listings without forcing them back to available.
      ...(isAdmin && existing.status !== "available" && existing.status !== "cancelled"
        ? {}
        : { status: "available" }),
    })
    .eq("id", listingId);
  if (!isAdmin) {
    updateQuery = updateQuery.eq("seller_id", user.id);
  }

  const { error } = await updateQuery;

  if (error) {
    throw new Error(error.message || t.errors.updateFailed);
  }

  await upsertPickupContacts(
    supabase,
    listingId,
    pickupMethod,
    pickupAddress,
    pickupPhone,
  );

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
  const ownerId = existing.seller_id;
  const uploadedPaths = await uploadListingImages(
    supabase,
    ownerId,
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

  if (isAdmin) {
    after(async () => {
      try {
        await notifyAdminListingChange({
          listingId,
          action: "updated",
          actorUserId: user.id,
        });
      } catch (error) {
        console.error("[notifyAdminListingChange:updated]", error);
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/account/transactions");
  revalidatePath("/admin");
  revalidatePath("/me");
  redirect(isAdmin ? `/admin?tab=listings` : `/market/${listingId}`);
}

export async function deleteListingAction(formData: FormData) {
  const { supabase, user } = await requireSeller();
  const { t } = await getI18n();
  const listingId = String(formData.get("listing_id") || "");
  if (!listingId) {
    redirect("/account/transactions?error=missing");
  }

  const [{ data: existing }, { data: profile }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, seller_id, status, title, price_cents")
      .eq("id", listingId)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = profile?.role === "admin";
  const backTo = isAdmin ? "/admin?tab=listings" : "/account/transactions";
  const withError = (message: string) =>
    `${backTo}${backTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`;

  if (!existing || (existing.seller_id !== user.id && !isAdmin)) {
    redirect(withError(t.errors.cannotDelete));
  }

  if (
    !isAdmin &&
    (existing.status === "reserved" ||
      existing.status === "at_church" ||
      existing.status === "sold")
  ) {
    redirect(withError(t.errors.cannotDeleteActive));
  }

  const shouldNotifyParties = isAdmin;
  const listingSnapshot = {
    title: existing.title || "Item",
    price_cents: existing.price_cents ?? 0,
    seller_id: existing.seller_id,
  };

  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  const paths = (images || []).map((row) => row.storage_path);
  if (paths.length) {
    await supabase.storage.from("listing-images").remove(paths);
  }

  // Soft-cancel first (works with existing update RLS even without DELETE policy)
  let cancelQuery = supabase
    .from("listings")
    .update({ status: "cancelled", cover_image_path: null })
    .eq("id", listingId);
  if (!isAdmin) {
    cancelQuery = cancelQuery.eq("seller_id", user.id);
  }
  const { error: cancelError } = await cancelQuery;

  if (cancelError) {
    redirect(withError(cancelError.message || t.errors.deleteFailed));
  }

  await supabase.from("listing_images").delete().eq("listing_id", listingId);

  // Best-effort hard delete when policy/FK allow it
  let hardDelete = supabase.from("listings").delete().eq("id", listingId);
  if (!isAdmin) {
    hardDelete = hardDelete.eq("seller_id", user.id);
  }
  await hardDelete;

  if (shouldNotifyParties) {
    after(async () => {
      try {
        await notifyAdminListingChange({
          listingId,
          action: "deleted",
          actorUserId: user.id,
          listingSnapshot,
        });
      } catch (error) {
        console.error("[notifyAdminListingChange:deleted]", error);
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/account/transactions");
  revalidatePath("/admin");
  revalidatePath("/me");
  redirect(isAdmin ? "/admin?tab=listings&deleted=1" : "/account/transactions?deleted=1");
}
