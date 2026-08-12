import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();

  return (
    <footer className="mt-auto border-t border-black/6 bg-[color-mix(in_oklab,var(--background)_55%,white)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 sm:py-10">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {t.siteFooter.contactLabel}
          </p>
          <p className="mt-1.5 text-sm text-foreground">{t.siteFooter.contact}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {t.siteFooter.contactPersonLabel}
          </p>
          <p className="mt-1.5 text-sm text-foreground">
            {t.siteFooter.contactPerson}
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
      <div className="border-t border-black/5">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-ink-muted sm:px-6">
          {t.siteFooter.note}
        </p>
      </div>
    </footer>
  );
}
