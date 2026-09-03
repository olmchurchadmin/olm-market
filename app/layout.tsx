import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { LocaleProvider } from "@/components/locale-provider";
import { NotificationToast } from "@/components/notification-toast";
import { NotificationsBanner } from "@/components/notifications-banner";
import { NotificationsProvider } from "@/components/notifications-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
  const [{ locale, t }, profile] = await Promise.all([
    getI18n(),
    getCurrentProfile(),
  ]);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSansKr.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <LocaleProvider locale={locale} dictionary={t}>
          <ConfirmDialogProvider>
            <NotificationsProvider enabled={Boolean(profile)}>
              <SiteHeader profile={profile} />
              <NotificationsBanner />
              <div className="flex-1">{children}</div>
              <SiteFooter />
              <NotificationToast />
            </NotificationsProvider>
          </ConfirmDialogProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
