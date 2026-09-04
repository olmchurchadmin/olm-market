import type { Locale } from "@/lib/i18n/config";

const categoryNamesEnBySlug: Record<string, string> = {
  sacred: "Sacred items",
  furniture: "Furniture",
  electronics: "Electronics",
  clothing: "Clothing",
  books: "Books",
  household: "Household",
  kids: "Kids",
  sports: "Sports equipment",
  other: "Other",
};

/** Fallback when slug is missing/mismatched but Korean name is known. */
const categoryNamesEnByKo: Record<string, string> = {
  성물: "Sacred items",
  가구: "Furniture",
  가전: "Electronics",
  의류: "Clothing",
  도서: "Books",
  생활용품: "Household",
  "유아/아동": "Kids",
  스포츠용품: "Sports equipment",
  기타: "Other",
};

export function categoryLabel(
  category: {
    slug?: string | null;
    name_ko?: string | null;
    name_en?: string | null;
  } | null | undefined,
  locale: Locale,
  fallback = "—",
) {
  if (!category) return fallback;
  if (locale === "en") {
    if (category.name_en?.trim()) return category.name_en.trim();
    const bySlug = category.slug
      ? categoryNamesEnBySlug[category.slug]
      : undefined;
    const byKo = category.name_ko
      ? categoryNamesEnByKo[category.name_ko]
      : undefined;
    return bySlug || byKo || category.name_ko || fallback;
  }
  return category.name_ko || fallback;
}
