import type { Locale } from "@/lib/i18n/config";
import { translateBetweenKoEn } from "@/lib/i18n/translate-ko-en";

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

function hasHangul(text: string | null | undefined) {
  return /[가-힣]/.test(text || "");
}

/** Stored EN still contains Hangul → needs another translation pass. */
export function listingHasIncompleteEnglish(listing: ListingTextFields) {
  const titleSource = listing.title_ko?.trim() || listing.title?.trim() || "";
  const descSource =
    listing.description_ko?.trim() || listing.description?.trim() || "";
  return (
    (Boolean(titleSource) &&
      (hasHangul(listing.title_en) ||
        (hasHangul(titleSource) && !listing.title_en?.trim()))) ||
    (Boolean(descSource) &&
      (hasHangul(listing.description_en) ||
        (hasHangul(descSource) && !listing.description_en?.trim())))
  );
}

export function listingTitle(
  listing: ListingTextFields | null | undefined,
  locale: Locale,
  fallback = "",
) {
  if (!listing) return fallback;
  if (locale === "en") {
    const en = listing.title_en?.trim();
    // Prefer EN only when it no longer has leftover Hangul.
    if (en && !hasHangul(en)) return en;
    return (
      listing.title?.trim() ||
      listing.title_ko?.trim() ||
      en ||
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
    const en = listing.description_en?.trim();
    if (en && !hasHangul(en)) return en;
    return (
      listing.description?.trim() ||
      listing.description_ko?.trim() ||
      en ||
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

  // Always produce both directions from the canonical text.
  // Mixed titles (Latin + Hangul) still get Hangul segments translated.
  const [titleEn, descriptionEn, titleKo, descriptionKo] = await Promise.all([
    translateBetweenKoEn(titleTrim, "ko", "en"),
    translateBetweenKoEn(descTrim, "ko", "en"),
    hasHangul(titleTrim)
      ? Promise.resolve(titleTrim)
      : translateBetweenKoEn(titleTrim, "en", "ko"),
    hasHangul(descTrim)
      ? Promise.resolve(descTrim)
      : translateBetweenKoEn(descTrim, "en", "ko"),
  ]);

  // If source was English-only, keep it as title_en / description_en.
  const titleLooksEn = !hasHangul(titleTrim) && /[A-Za-z]/.test(titleTrim);
  const descLooksEn = !hasHangul(descTrim) && /[A-Za-z]/.test(descTrim);

  return {
    title_ko: hasHangul(titleTrim) ? titleTrim : titleKo || titleTrim,
    title_en: titleLooksEn ? titleTrim : titleEn || titleTrim,
    description_ko: hasHangul(descTrim) ? descTrim : descriptionKo || descTrim,
    description_en: descLooksEn ? descTrim : descriptionEn || descTrim,
  };
}

export function listingNeedsI18n(
  listing: ListingTextFields,
  locale: Locale,
) {
  if (locale === "en") {
    return (
      !listing.title_en?.trim() ||
      !listing.description_en?.trim() ||
      listingHasIncompleteEnglish(listing)
    );
  }
  return !listing.title_ko?.trim() || !listing.description_ko?.trim();
}
