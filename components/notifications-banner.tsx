"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import { useNotifications } from "@/components/notifications-provider";

export function NotificationsBanner() {
  const { t } = useI18n();
  const {
    emailBannerOpen,
    tradeBannerOpen,
    needsEmail,
    unreadNotifications,
    dismissEmailBanner,
    dismissTradeBanner,
    markAllRead,
    pending,
  } = useNotifications();

  if (!emailBannerOpen && !tradeBannerOpen) return null;

  return (
    <div className="border-b border-brand/15 bg-[#e8eefc]">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6 sm:py-3.5">
        {emailBannerOpen && needsEmail ? (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {t.alerts.emailRequiredTitle}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {t.alerts.emailRequiredBody}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href="/account/profile"
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft"
                  onClick={() => {
                    sessionStorage.setItem("cm_email_alert_dismissed", "1");
                    dismissEmailBanner();
                  }}
                >
                  {t.alerts.addEmailCta}
                </Link>
                <button
                  type="button"
                  onClick={dismissEmailBanner}
                  className="rounded-md border border-brand/15 bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-neutral-100"
                >
                  {t.alerts.later}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissEmailBanner}
              className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-white/70 hover:text-foreground"
              aria-label={t.alerts.close}
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}

        {tradeBannerOpen ? (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              {unreadNotifications.map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={markAllRead}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
                >
                  {t.alerts.markAllRead}
                </button>
                <button
                  type="button"
                  onClick={dismissTradeBanner}
                  className="rounded-md border border-brand/15 bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-neutral-100"
                >
                  {t.alerts.close}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissTradeBanner}
              className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-white/70 hover:text-foreground"
              aria-label={t.alerts.close}
            >
              <XMarkIcon className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
