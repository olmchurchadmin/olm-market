import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  const year = new Date().getFullYear();
  const copyright = t.siteFooter.copyright.replace("{year}", String(year));

  return (
    <footer className="mt-auto border-t border-black/6 bg-[color-mix(in_oklab,var(--background)_55%,white)]">
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
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {t.siteFooter.legalLabel}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center rounded-md border border-brand/15 bg-white px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
            >
              {t.siteFooter.privacyCta}
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-soft"
            >
              {t.siteFooter.termsCta}
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-muted">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
