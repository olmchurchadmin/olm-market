"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import { useNotifications } from "@/components/notifications-provider";

/**
 * Only the "add a notification email" prompt lives up here now. Trade alerts
 * moved to the bell and a small toast so they never push the page down.
 */
export function NotificationsBanner() {
  const { t } = useI18n();
  const { emailBannerOpen, needsEmail, dismissEmailBanner } = useNotifications();

  if (!emailBannerOpen || !needsEmail) return null;

  return (
    <div className="border-b border-brand/15 bg-[#e8eefc]">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 sm:px-6">
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
              onClick={dismissEmailBanner}
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
    </div>
  );
}
