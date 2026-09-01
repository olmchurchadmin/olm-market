import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getTermsPage } from "@/lib/i18n/legal";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Terms and Conditions | OLM Market",
  description: "Terms and conditions for using the OLM Market parish marketplace.",
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { locale: cookieLocale, t } = await getI18n();
  const { lang } = await searchParams;
  const locale: Locale = isLocale(lang) ? lang : cookieLocale;
  const page = getTermsPage(locale);

  return (
    <LegalDocument
      page={page}
      crossLink={{
        href: `/privacy${locale === "en" ? "" : `?lang=${locale}`}`,
        label: t.legal.privacyLink,
      }}
    />
  );
}
