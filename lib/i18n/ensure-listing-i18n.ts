import { after } from "next/server";
import { revalidatePath } from "next/cache";
import {
  buildListingI18n,
  listingNeedsI18nRepair,
  type ListingTextFields,
} from "@/lib/i18n/listings";
import type { Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

function missingLocaleFields(listing: ListingTextFields, locale: Locale) {
  if (locale === "en") {
    return (
      (Boolean(listing.title?.trim()) && !listing.title_en?.trim()) ||
      (Boolean(listing.description?.trim()) && !listing.description_en?.trim())
    );
  }
  return (
    (Boolean(listing.title?.trim()) && !listing.title_ko?.trim()) ||
    (Boolean(listing.description?.trim()) && !listing.description_ko?.trim())
  );
}

async function persistI18n(
  listingId: string,
  title: string,
  description: string,
) {
  const i18n = await buildListingI18n(title, description);
  const supabase = await createClient();
  await supabase
    .from("listings")
    .update({
      title_ko: i18n.title_ko,
      title_en: i18n.title_en,
      description_ko: i18n.description_ko,
      description_en: i18n.description_en,
    })
    .eq("id", listingId);
  return i18n;
}

/**
 * Fill/repair bilingual title/description fields for listings.
 * Awaits when the active locale is missing or brand spelling is wrong.
 */
export async function ensureListingI18nFields<
  T extends ListingTextFields & { id: string },
>(listing: T, locale: Locale): Promise<T> {
  if (!listingNeedsI18nRepair(listing)) return listing;

  const needsNow =
    missingLocaleFields(listing, locale) || listingNeedsI18nRepair(listing);

  if (!needsNow) {
    after(() => {
      void persistI18n(listing.id, listing.title || "", listing.description || "")
        .then(() => {
          revalidatePath(`/market/${listing.id}`);
          revalidatePath("/");
        })
        .catch((error) => console.error("[ensureListingI18nFields:bg]", error));
    });
    return listing;
  }

  try {
    const i18n = await persistI18n(
      listing.id,
      listing.title || "",
      listing.description || "",
    );
    after(() => {
      revalidatePath(`/market/${listing.id}`);
      revalidatePath("/");
      revalidatePath("/market");
    });
    return { ...listing, ...i18n };
  } catch (error) {
    console.error("[ensureListingI18nFields]", error);
    return listing;
  }
}

/** Best-effort title/description fill for a market page of cards. */
export async function ensureListingTitlesForLocale<
  T extends ListingTextFields & { id: string },
>(listings: T[], locale: Locale): Promise<T[]> {
  const need = listings.filter(
    (listing) =>
      missingLocaleFields(listing, locale) || listingNeedsI18nRepair(listing),
  );
  if (!need.length) return listings;

  const updated = new Map<string, Awaited<ReturnType<typeof buildListingI18n>>>();
  await Promise.all(
    need.slice(0, 12).map(async (listing) => {
      try {
        const i18n = await persistI18n(
          listing.id,
          listing.title || "",
          listing.description || "",
        );
        updated.set(listing.id, i18n);
      } catch (error) {
        console.error("[ensureListingTitlesForLocale]", listing.id, error);
      }
    }),
  );

  if (!updated.size) return listings;
  return listings.map((listing) => {
    const patch = updated.get(listing.id);
    return patch ? { ...listing, ...patch } : listing;
  });
}
