import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getTermsPage } from "@/lib/i18n/legal";
import { getRegisteredBrandName } from "@/lib/legal/brand";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const brandName = getRegisteredBrandName();
  return {
    title: `Terms and Conditions | ${brandName}`,
    description: `Terms and conditions for ${brandName}, operator of OLM Market.`,
  };
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { locale: cookieLocale } = await getI18n();
  const { lang } = await searchParams;
  const locale: Locale = isLocale(lang) ? lang : cookieLocale;
  const page = getTermsPage(locale);

  return <LegalDocument page={page} />;
}
