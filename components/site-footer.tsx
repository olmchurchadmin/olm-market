"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const copyright = t.siteFooter.copyright.replace("{year}", String(year));

  return (
    <footer className="mt-auto border-t border-black/6 bg-[color-mix(in_oklab,var(--background)_55%,white)] pb-6 sm:pb-8">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 sm:py-10">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {t.siteFooter.contactLabel}
          </p>
          <p className="mt-1.5 text-sm text-foreground">
            <a
              href={`tel:${t.siteFooter.contact.replace(/\D/g, "")}`}
              className="hover:underline"
            >
              {t.siteFooter.contact}
            </a>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {t.siteFooter.emailLabel}
          </p>
          <p className="mt-1.5 text-sm text-foreground">
            <a
              href={`mailto:${t.siteFooter.email}`}
              className="break-all hover:underline"
            >
              {t.siteFooter.email}
            </a>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {t.siteFooter.addressLabel}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {t.siteFooter.address}
          </p>
        </div>
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
