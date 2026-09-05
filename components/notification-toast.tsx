"use client";

import { BellAlertIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import { NotificationDetailRows } from "@/components/notification-detail-rows";
import { useNotifications } from "@/components/notifications-provider";
import { notificationActionHref } from "@/lib/notification-links";

export function NotificationToast() {
  const { t } = useI18n();
  const { toast, dismissToast, markRead, pending } = useNotifications();

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-black/8 bg-white shadow-[0_16px_40px_rgba(26,28,31,0.18)]"
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <BellAlertIcon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-brand uppercase">
            {t.alerts.newAlert}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {toast.title}
          </p>
          <NotificationDetailRows details={toast.details} t={t} compact />
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed whitespace-pre-line text-ink-muted">
            {toast.body}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const href = notificationActionHref(
                toast.type,
                toast.payload?.event,
              );
              markRead([toast.id]);
              dismissToast();
              if (href) {
                window.location.assign(href);
              }
            }}
            className="mt-2 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
          >
            {t.alerts.ok}
          </button>
        </div>
        <button
          type="button"
          onClick={dismissToast}
          className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-black/5 hover:text-foreground"
          aria-label={t.alerts.close}
        >
          <XMarkIcon className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
