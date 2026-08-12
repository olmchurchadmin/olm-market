import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeader } from "@/components/site-header";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OLM Market | 성당 온라인 장터",
  description:
    "Our Lady of Mercy Parish 공동체 온라인 가라지 세일. 물건을 올리고, 사고, 성당에서 픽업하세요.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getI18n();

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <LocaleProvider locale={locale} dictionary={t}>
          <ConfirmDialogProvider>
            <SiteHeader />
            {children}
          </ConfirmDialogProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
