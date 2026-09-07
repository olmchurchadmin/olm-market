"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/locale-provider";

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const copyright = t.siteFooter.copyright.replace("{year}", String(year));
  const [contactOpen, setContactOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!contactOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setContactOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setContactOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [contactOpen]);

  return (
    <footer className="mt-auto border-t border-black/6 bg-[color-mix(in_oklab,var(--background)_55%,white)]">
      <div className="mx-auto max-w-6xl px-4 py-5 text-center sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs text-ink-muted">
          <Link href="/privacy" className="hover:text-brand hover:underline">
            {t.siteFooter.privacy}
          </Link>
          <span aria-hidden="true" className="text-ink-muted/50">
            ·
          </span>
          <Link href="/terms" className="hover:text-brand hover:underline">
            {t.siteFooter.terms}
          </Link>
          <span aria-hidden="true" className="text-ink-muted/50">
            ·
          </span>
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={contactOpen}
            aria-controls={panelId}
            onClick={() => setContactOpen((open) => !open)}
            className="rounded border border-brand/15 bg-white px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-brand/5"
          >
            {t.siteFooter.contactCta}
          </button>
        </div>

        {contactOpen ? (
          <div
            ref={panelRef}
            id={panelId}
            className="mx-auto mt-3 max-w-sm rounded-md border border-brand/10 bg-white/80 px-4 py-3 text-left text-sm text-foreground"
          >
            <dl className="space-y-2">
              <div>
                <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  {t.siteFooter.managerLabel}
                </dt>
                <dd className="mt-0.5">{t.siteFooter.manager}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  {t.siteFooter.emailLabel}
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${t.siteFooter.email}`}
                    className="break-all hover:underline"
                  >
                    {t.siteFooter.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                  {t.siteFooter.contactLabel}
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={`tel:${t.siteFooter.contact.replace(/\D/g, "")}`}
                    className="hover:underline"
                  >
                    {t.siteFooter.contact}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-ink-muted/80">{copyright}</p>
      </div>
    </footer>
  );
}
