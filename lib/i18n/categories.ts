import type { Locale } from "@/lib/i18n/config";

const categoryNamesEn: Record<string, string> = {
  furniture: "Furniture",
  electronics: "Electronics",
  clothing: "Clothing",
  books: "Books",
  household: "Household",
  kids: "Kids",
  other: "Other",
};

export function categoryLabel(
  category: { slug: string; name_ko: string } | null | undefined,
  locale: Locale,
  fallback = "—",
) {
  if (!category) return fallback;
  if (locale === "en") {
    return categoryNamesEn[category.slug] || category.name_ko || fallback;
  }
  return category.name_ko || fallback;
}
