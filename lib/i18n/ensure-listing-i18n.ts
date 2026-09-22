import { after } from "next/server";
import { revalidatePath } from "next/cache";
import {
  buildListingI18n,
  listingHasIncompleteEnglish,
  provisionalListingI18n,
  type ListingTextFields,
} from "@/lib/i18n/listings";
import type { Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

function missingLocaleFields(listing: ListingTextFields, locale: Locale) {
  if (locale === "en") {
    return (
      (Boolean(listing.title?.trim()) && !listing.title_en?.trim()) ||
      (Boolean(listing.description?.trim()) && !listing.description_en?.trim()) ||
      listingHasIncompleteEnglish(listing)
    );
  }
  return (
    (Boolean(listing.title?.trim()) && !listing.title_ko?.trim()) ||
    (Boolean(listing.description?.trim()) && !listing.description_ko?.trim())
  );
}

function needsAnyI18nWork(listing: ListingTextFields) {
  return (
    missingLocaleFields(listing, "en") || missingLocaleFields(listing, "ko")
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
 * Fill/repair bilingual title/description fields in the background.
 * Never blocks page render on translation APIs.
 */
export async function ensureListingI18nFields<
  T extends ListingTextFields & { id: string },
>(listing: T, locale: Locale): Promise<T> {
  if (!needsAnyI18nWork(listing)) return listing;

  const title = listing.title || "";
  const description = listing.description || "";
  const provisional = provisionalListingI18n(title, description);
  const patched = {
    ...listing,
    title_ko: listing.title_ko?.trim() || provisional.title_ko,
    title_en: listing.title_en?.trim() || provisional.title_en,
    description_ko: listing.description_ko?.trim() || provisional.description_ko,
    description_en: listing.description_en?.trim() || provisional.description_en,
  };

  after(() => {
    void persistI18n(listing.id, title, description)
      .then(() => {
        revalidatePath(`/market/${listing.id}`);
        revalidatePath("/");
        revalidatePath("/market");
      })
      .catch((error) => console.error("[ensureListingI18nFields:bg]", error));
  });

  // Prefer existing locale text when present; otherwise provisional.
  if (!missingLocaleFields(listing, locale)) return listing;
  return patched;
}

/** Best-effort title/description fill for a market page of cards — never blocks. */
export async function ensureListingTitlesForLocale<
  T extends ListingTextFields & { id: string },
>(listings: T[], locale: Locale): Promise<T[]> {
  const need = listings.filter((listing) =>
    missingLocaleFields(listing, locale),
  );
  if (!need.length) return listings;

  after(() => {
    void Promise.all(
      need.slice(0, 12).map(async (listing) => {
        try {
          await persistI18n(
            listing.id,
            listing.title || "",
            listing.description || "",
          );
        } catch (error) {
          console.error("[ensureListingTitlesForLocale]", listing.id, error);
        }
      }),
    ).then(() => {
      revalidatePath("/");
      revalidatePath("/market");
    });
  });

  return listings.map((listing) => {
    if (!missingLocaleFields(listing, locale)) return listing;
    const provisional = provisionalListingI18n(
      listing.title || "",
      listing.description || "",
    );
    return {
      ...listing,
      title_ko: listing.title_ko?.trim() || provisional.title_ko,
      title_en: listing.title_en?.trim() || provisional.title_en,
      description_ko:
        listing.description_ko?.trim() || provisional.description_ko,
      description_en:
        listing.description_en?.trim() || provisional.description_en,
    };
  });
}
