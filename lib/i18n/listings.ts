import type { Locale } from "@/lib/i18n/config";
import {
  detectTextLocale,
  translateBetweenKoEn,
} from "@/lib/i18n/translate-ko-en";

export type ListingTextFields = {
  title?: string | null;
  description?: string | null;
  title_ko?: string | null;
  title_en?: string | null;
  description_ko?: string | null;
  description_en?: string | null;
};

export type ListingI18nPayload = {
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
};

export function listingTitle(
  listing: ListingTextFields | null | undefined,
  locale: Locale,
  fallback = "",
) {
  if (!listing) return fallback;
  if (locale === "en") {
    return (
      listing.title_en?.trim() ||
      listing.title?.trim() ||
      listing.title_ko?.trim() ||
      fallback
    );
  }
  return (
    listing.title_ko?.trim() ||
    listing.title?.trim() ||
    listing.title_en?.trim() ||
    fallback
  );
}

export function listingDescription(
  listing: ListingTextFields | null | undefined,
  locale: Locale,
  fallback = "",
) {
  if (!listing) return fallback;
  if (locale === "en") {
    return (
      listing.description_en?.trim() ||
      listing.description?.trim() ||
      listing.description_ko?.trim() ||
      fallback
    );
  }
  return (
    listing.description_ko?.trim() ||
    listing.description?.trim() ||
    listing.description_en?.trim() ||
    fallback
  );
}

/** Build ko/en copies from the seller's canonical title/description. */
export async function buildListingI18n(
  title: string,
  description: string,
): Promise<ListingI18nPayload> {
  const titleTrim = title.trim();
  const descTrim = description.replace(/\r\n/g, "\n").trim();
  const source = detectTextLocale(`${titleTrim}\n${descTrim}`);

  if (source === "ko") {
    const [titleEn, descriptionEn] = await Promise.all([
      translateBetweenKoEn(titleTrim, "ko", "en"),
      translateBetweenKoEn(descTrim, "ko", "en"),
    ]);
    return {
      title_ko: titleTrim,
      title_en: titleEn || titleTrim,
      description_ko: descTrim,
      description_en: descriptionEn || descTrim,
    };
  }

  if (source === "en") {
    const [titleKo, descriptionKo] = await Promise.all([
      translateBetweenKoEn(titleTrim, "en", "ko"),
      translateBetweenKoEn(descTrim, "en", "ko"),
    ]);
    return {
      title_ko: titleKo || titleTrim,
      title_en: titleTrim,
      description_ko: descriptionKo || descTrim,
      description_en: descTrim,
    };
  }

  // Mixed / unknown: keep original on both sides, still try EN↔KO for each field.
  const titleSource = detectTextLocale(titleTrim);
  const descSource = detectTextLocale(descTrim);
  const [titleKo, titleEn, descriptionKo, descriptionEn] = await Promise.all([
    titleSource === "en"
      ? translateBetweenKoEn(titleTrim, "en", "ko")
      : Promise.resolve(titleTrim),
    titleSource === "ko"
      ? translateBetweenKoEn(titleTrim, "ko", "en")
      : Promise.resolve(titleTrim),
    descSource === "en"
      ? translateBetweenKoEn(descTrim, "en", "ko")
      : Promise.resolve(descTrim),
    descSource === "ko"
      ? translateBetweenKoEn(descTrim, "ko", "en")
      : Promise.resolve(descTrim),
  ]);

  return {
    title_ko: titleKo || titleTrim,
    title_en: titleEn || titleTrim,
    description_ko: descriptionKo || descTrim,
    description_en: descriptionEn || descTrim,
  };
}

export function listingNeedsI18n(
  listing: ListingTextFields,
  locale: Locale,
) {
  if (locale === "en") {
    return !listing.title_en?.trim() || !listing.description_en?.trim();
  }
  return !listing.title_ko?.trim() || !listing.description_ko?.trim();
}
