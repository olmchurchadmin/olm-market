"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const copyright = t.siteFooter.copyright.replace("{year}", String(year));
  const telHref = `tel:${t.siteFooter.contact.replace(/\D/g, "")}`;

  return (
    <footer className="mt-auto border-t border-black/6 bg-[color-mix(in_oklab,var(--background)_55%,white)] pb-6 sm:pb-8">
      <div className="mx-auto max-w-6xl space-y-1.5 px-4 py-8 text-sm text-foreground sm:px-6 sm:py-10">
        <p>
          {t.siteFooter.managerLabel}: {t.siteFooter.manager}
        </p>
        <p>
          {t.siteFooter.emailLabel}:{" "}
          <a
            href={`mailto:${t.siteFooter.email}`}
            className="break-all hover:underline"
          >
            {t.siteFooter.email}
          </a>
        </p>
        <p>
          {t.siteFooter.contactLabel}:{" "}
          <a href={telHref} className="hover:underline">
            {t.siteFooter.contact}
          </a>
        </p>
        <p className="whitespace-nowrap">
          {t.siteFooter.addressLabel}: {t.siteFooter.address}
        </p>
      </div>
      <div className="border-t border-black/6">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-2 text-center sm:px-6">
          <p className="text-xs text-ink-muted">
            <Link href="/privacy" className="hover:text-brand hover:underline">
              {t.siteFooter.privacy}
            </Link>
            <span aria-hidden="true" className="mx-2 text-ink-muted/50">
              ·
            </span>
            <Link href="/terms" className="hover:text-brand hover:underline">
              {t.siteFooter.terms}
            </Link>
          </p>
          <p className="mt-2 text-xs text-ink-muted/80">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
