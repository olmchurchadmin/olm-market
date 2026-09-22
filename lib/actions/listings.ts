"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { buildListingI18n, provisionalListingI18n } from "@/lib/i18n/listings";
import { isStaffRole } from "@/lib/auth";
import { notifyListingCreated, notifyAdminListingChange } from "@/lib/notifications/dispatch";
import { createClient } from "@/lib/supabase/server";
import type { ItemCondition, PickupMethod } from "@/lib/types";

export type SaveListingResult =
  | { ok: true; href: string }
  | { ok: false; error: string };

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
  const conditionRaw = String(formData.get("item_condition") || "used");
  const itemCondition: ItemCondition =
    conditionRaw === "new" ? "new" : "used";
  const quantityRaw = Number(formData.get("quantity") || 1);
  const quantityTotal = Math.min(
    99,
    Math.max(1, Math.floor(Number.isFinite(quantityRaw) ? quantityRaw : 1)),
  );
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
    itemCondition,
    quantityTotal,
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
  const slice = files.slice(0, 6);
  const maxPerFile = 900_000;
  const maxTotal = 3.5 * 1024 * 1024;
  const { t } = await getI18n();
  for (const file of slice) {
    if (file.size > maxPerFile) {
      throw new Error(t.sell.photoStillTooLarge);
    }
  }
  const totalBytes = slice.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > maxTotal) {
    throw new Error(t.sell.photoTotalTooLarge);
  }

  // Sequential uploads keep serverless memory lower than Promise.all.
  const uploaded: Array<{ path: string; sort_order: number } | null> = [];
  for (let i = 0; i < slice.length; i++) {
    const file = slice[i]!;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${userId}/${listingId}/${startOrder + i}-${crypto.randomUUID()}.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
    uploaded.push(uploadError ? null : { path, sort_order: startOrder + i });
  }

  const rows = uploaded.filter(
    (row): row is { path: string; sort_order: number } => Boolean(row),
  );
  if (rows.length) {
    await supabase.from("listing_images").insert(
      rows.map((row) => ({
        listing_id: listingId,
        storage_path: row.path,
        sort_order: row.sort_order,
      })),
    );
  }
  return rows.map((row) => row.path);
}

export async function createListingAction(
  formData: FormData,
): Promise<SaveListingResult> {
  const { t } = await getI18n();

  try {
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
      itemCondition,
      quantityTotal,
      files,
    } = await parseListingFields(formData);

    const i18n = provisionalListingI18n(title, description);

    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        seller_id: user.id,
        category_id: categoryId,
        title,
        description,
        title_ko: i18n.title_ko,
        title_en: i18n.title_en,
        description_ko: i18n.description_ko,
        description_en: i18n.description_en,
        price_cents: priceCents,
        donation_percent: donationPercent,
        pickup_method: pickupMethod,
        item_condition: itemCondition,
        quantity_total: quantityTotal,
        quantity_remaining: quantityTotal,
        status: "available",
      })
      .select("id")
      .single();

    if (error || !listing) {
      return { ok: false, error: error?.message || t.errors.createFailed };
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
      const message =
        contactError instanceof Error && contactError.message
          ? contactError.message
          : t.errors.createFailed;
      return { ok: false, error: message };
    }

    // Photos, translation, and notifications continue after the client navigates.
    after(async () => {
      try {
        if (files.length) {
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
        }
      } catch (error) {
        console.error("[createListingAction:images]", error);
      }
      try {
        const translated = await buildListingI18n(title, description);
        await supabase
          .from("listings")
          .update({
            title_ko: translated.title_ko,
            title_en: translated.title_en,
            description_ko: translated.description_ko,
            description_en: translated.description_en,
          })
          .eq("id", listing.id);
      } catch (error) {
        console.error("[createListingAction:i18n]", error);
      }
      try {
        await notifyListingCreated(listing.id);
      } catch (error) {
        console.error("[notifyListingCreated]", error);
      }
      revalidatePath("/");
      revalidatePath("/market");
      revalidatePath(`/market/${listing.id}`);
      revalidatePath("/account/transactions");
      revalidatePath("/me");
    });

    revalidatePath(`/market/${listing.id}`);
    return { ok: true, href: `/market/${listing.id}` };
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : t.errors.createFailed;
    return { ok: false, error: message };
  }
}

export async function updateListingAction(
  formData: FormData,
): Promise<SaveListingResult> {
  const { t } = await getI18n();
  const listingId = String(formData.get("listing_id") || "");

  try {
    const { supabase, user } = await requireSeller();
    if (!listingId) {
      return { ok: false, error: t.errors.listingNotFound };
    }

    const {
      title,
      description,
      categoryId,
      priceCents,
      donationPercent,
      pickupMethod,
      pickupAddress,
      pickupPhone,
      itemCondition,
      quantityTotal,
      files,
    } = await parseListingFields(formData);

    const [{ data: existing, error: loadError }, { data: profile }] =
      await Promise.all([
        supabase
          .from("listings")
          .select(
            "id, seller_id, status, cover_image_path, quantity_total, quantity_remaining, title, description, title_ko, title_en, description_ko, description_en",
          )
          .eq("id", listingId)
          .maybeSingle(),
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      ]);

    const isAdmin = isStaffRole(profile?.role);
    if (loadError || !existing || (existing.seller_id !== user.id && !isAdmin)) {
      return { ok: false, error: t.errors.cannotEdit };
    }
    if (
      !isAdmin &&
      existing.status !== "available" &&
      existing.status !== "cancelled"
    ) {
      return { ok: false, error: t.errors.cannotEditActive };
    }

    const prevTotal = Math.max(1, Number(existing.quantity_total) || 1);
    const prevRemaining = Math.max(
      0,
      Number(existing.quantity_remaining) || prevTotal,
    );
    const soldCount = Math.max(0, prevTotal - prevRemaining);
    if (quantityTotal < soldCount) {
      return { ok: false, error: t.sell.quantityTooLow };
    }
    const nextRemaining = quantityTotal - soldCount;
    const textChanged =
      (existing.title || "") !== title ||
      (existing.description || "") !== description;
    const i18n = textChanged
      ? provisionalListingI18n(title, description)
      : {
          title_ko: existing.title_ko || title,
          title_en: existing.title_en || title,
          description_ko: existing.description_ko || description,
          description_en: existing.description_en || description,
        };

    let updateQuery = supabase
      .from("listings")
      .update({
        category_id: categoryId,
        title,
        description,
        title_ko: i18n.title_ko,
        title_en: i18n.title_en,
        description_ko: i18n.description_ko,
        description_en: i18n.description_en,
        price_cents: priceCents,
        donation_percent: donationPercent,
        pickup_method: pickupMethod,
        item_condition: itemCondition,
        quantity_total: quantityTotal,
        quantity_remaining: nextRemaining,
        ...(isAdmin &&
        existing.status !== "available" &&
        existing.status !== "cancelled"
          ? {}
          : {
              status: nextRemaining > 0 ? "available" : existing.status,
            }),
      })
      .eq("id", listingId);
    if (!isAdmin) {
      updateQuery = updateQuery.eq("seller_id", user.id);
    }

    const { error } = await updateQuery;
    if (error) {
      return { ok: false, error: error.message || t.errors.updateFailed };
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
    const ownerId = existing.seller_id;
    const successHref = isAdmin
      ? `/admin?tab=listings`
      : `/market/${listingId}`;
    const hasImageWork = removeIds.length > 0 || files.length > 0;

    after(async () => {
      try {
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
        const uploadedPaths = files.length
          ? await uploadListingImages(
              supabase,
              ownerId,
              listingId,
              files.slice(0, slots),
              startOrder,
            )
          : [];

        if (hasImageWork) {
          const cover =
            remaining?.[0]?.storage_path ||
            uploadedPaths[0] ||
            null;
          await supabase
            .from("listings")
            .update({ cover_image_path: cover })
            .eq("id", listingId);
        }
      } catch (error) {
        console.error("[updateListingAction:images]", error);
      }

      if (textChanged) {
        try {
          const translated = await buildListingI18n(title, description);
          await supabase
            .from("listings")
            .update({
              title_ko: translated.title_ko,
              title_en: translated.title_en,
              description_ko: translated.description_ko,
              description_en: translated.description_en,
            })
            .eq("id", listingId);
        } catch (error) {
          console.error("[updateListingAction:i18n]", error);
        }
      }
      if (isAdmin) {
        try {
          await notifyAdminListingChange({
            listingId,
            action: "updated",
            actorUserId: user.id,
          });
        } catch (error) {
          console.error("[notifyAdminListingChange:updated]", error);
        }
      }
      revalidatePath("/");
      revalidatePath("/market");
      revalidatePath(`/market/${listingId}`);
      revalidatePath("/account/transactions");
      revalidatePath("/admin");
      revalidatePath("/me");
    });

    revalidatePath(successHref);
    revalidatePath(`/market/${listingId}`);
    return { ok: true, href: successHref };
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : t.errors.updateFailed;
    return { ok: false, error: message };
  }
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

  const isAdmin = isStaffRole(profile?.role);
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
      revalidatePath("/");
      revalidatePath("/market");
      revalidatePath(`/market/${listingId}`);
      revalidatePath("/account/transactions");
      revalidatePath("/admin");
      revalidatePath("/me");
    });
  } else {
    after(() => {
      revalidatePath("/");
      revalidatePath("/market");
      revalidatePath(`/market/${listingId}`);
      revalidatePath("/account/transactions");
      revalidatePath("/admin");
      revalidatePath("/me");
    });
  }

  redirect(isAdmin ? "/admin?tab=listings&deleted=1" : "/account/transactions?deleted=1");
}

export async function toggleListingFeaturedAction(formData: FormData) {
  const { supabase, user } = await requireSeller();
  const { t } = await getI18n();
  const listingId = String(formData.get("listing_id") || "");
  if (!listingId) throw new Error(t.errors.listingNotFound);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isStaffRole(profile?.role)) {
    throw new Error(t.errors.cannotEdit);
  }

  const { data: existing, error: loadError } = await supabase
    .from("listings")
    .select("id, is_featured")
    .eq("id", listingId)
    .maybeSingle();

  if (loadError || !existing) {
    throw new Error(t.errors.listingNotFound);
  }

  const nextFeatured = !Boolean(existing.is_featured);
  const { error } = await supabase
    .from("listings")
    .update({ is_featured: nextFeatured })
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message || t.errors.updateFailed);
  }

  revalidatePath("/");
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/admin");
}
