import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { SiteHeader } from "@/components/site-header";
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
  title: "Church Market | 성당 온라인 장터",
  description:
    "성당 공동체 온라인 가라지 세일. 물건을 올리고, 사고, 성당에서 픽업하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ConfirmDialogProvider>
          <SiteHeader />
          {children}
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
