import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getPrivacyPage } from "@/lib/i18n/legal";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Privacy Policy | OLM Market",
  description:
    "Privacy policy for OLM Market, including SMS opt-in, message frequency, and mobile number use.",
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { locale: cookieLocale, t } = await getI18n();
  const { lang } = await searchParams;
  const locale: Locale = isLocale(lang) ? lang : cookieLocale;
  const page = getPrivacyPage(locale);

  return (
    <LegalDocument
      page={page}
      crossLink={{
        href: `/terms${locale === "en" ? "" : `?lang=${locale}`}`,
        label: t.legal.termsLink,
      }}
    />
  );
}
