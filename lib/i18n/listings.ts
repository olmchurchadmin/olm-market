import type { Locale } from "@/lib/i18n/config";
import {
  detectTextLocale,
  listingNeedsBrandRepair,
  polishListingProperNouns,
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

function englishDisplayFromSource(
  english: string | null | undefined,
  sourceKo: string,
  fallback: string,
) {
  const source = sourceKo.trim();
  let en = (english || "").trim();

  // Already-stored bad/missing EN for 톰브라운 → force brand onto the best available string.
  if (listingNeedsBrandRepair(source, en)) {
    const base = en || source || fallback;
    en = polishListingProperNouns(base, "ko|en");
    if (listingNeedsBrandRepair(source, en)) {
      en = polishListingProperNouns(
        source.replace(/톰\s*브라운/g, "Thom Browne") || base,
        "ko|en",
      );
    }
    return en || fallback;
  }

  return polishListingProperNouns(en || source || fallback, "ko|en");
}

export function listingTitle(
  listing: ListingTextFields | null | undefined,
  locale: Locale,
  fallback = "",
) {
  if (!listing) return fallback;
  const sourceKo =
    listing.title_ko?.trim() || listing.title?.trim() || "";
  if (locale === "en") {
    return englishDisplayFromSource(listing.title_en, sourceKo, fallback);
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
  const sourceKo =
    listing.description_ko?.trim() || listing.description?.trim() || "";
  if (locale === "en") {
    return englishDisplayFromSource(
      listing.description_en,
      sourceKo,
      fallback,
    );
  }
  return (
    listing.description_ko?.trim() ||
    listing.description?.trim() ||
    listing.description_en?.trim() ||
    fallback
  );
}

/** True when stored EN is missing or brand spelling needs a rewrite. */
export function listingNeedsI18nRepair(listing: ListingTextFields) {
  const titleSource = listing.title_ko?.trim() || listing.title?.trim() || "";
  const descSource =
    listing.description_ko?.trim() || listing.description?.trim() || "";
  const missingEn =
    (Boolean(titleSource) && !listing.title_en?.trim()) ||
    (Boolean(descSource) && !listing.description_en?.trim());
  const missingKo =
    (Boolean(listing.title?.trim()) && !listing.title_ko?.trim()) ||
    (Boolean(listing.description?.trim()) && !listing.description_ko?.trim());
  return (
    missingEn ||
    missingKo ||
    listingNeedsBrandRepair(titleSource, listing.title_en) ||
    listingNeedsBrandRepair(descSource, listing.description_en)
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

  let payload: ListingI18nPayload;

  if (source === "ko") {
    const [titleEn, descriptionEn] = await Promise.all([
      translateBetweenKoEn(titleTrim, "ko", "en"),
      translateBetweenKoEn(descTrim, "ko", "en"),
    ]);
    payload = {
      title_ko: titleTrim,
      title_en: titleEn || titleTrim,
      description_ko: descTrim,
      description_en: descriptionEn || descTrim,
    };
  } else if (source === "en") {
    const [titleKo, descriptionKo] = await Promise.all([
      translateBetweenKoEn(titleTrim, "en", "ko"),
      translateBetweenKoEn(descTrim, "en", "ko"),
    ]);
    payload = {
      title_ko: titleKo || titleTrim,
      title_en: titleTrim,
      description_ko: descriptionKo || descTrim,
      description_en: descTrim,
    };
  } else {
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

    payload = {
      title_ko: titleKo || titleTrim,
      title_en: titleEn || titleTrim,
      description_ko: descriptionKo || descTrim,
      description_en: descriptionEn || descTrim,
    };
  }

  return {
    title_ko: polishListingProperNouns(payload.title_ko, "en|ko"),
    title_en: polishListingProperNouns(payload.title_en, "ko|en"),
    description_ko: polishListingProperNouns(payload.description_ko, "en|ko"),
    description_en: polishListingProperNouns(payload.description_en, "ko|en"),
  };
}
