"use client";

import { BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/components/locale-provider";
import { NotificationDetailRows } from "@/components/notification-detail-rows";
import { useNotifications } from "@/components/notifications-provider";

export function NotificationBell() {
  const { t, locale } = useI18n();
  const {
    enabled,
    unreadCount,
    recentNotifications,
    panelOpen,
    setPanelOpen,
    markRead,
    markAllRead,
    pending,
    markFailed,
  } = useNotifications();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanelOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen, setPanelOpen]);

  if (!enabled) return null;

  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-black/5"
        aria-expanded={panelOpen}
        aria-controls={panelId}
        aria-label={
          badge
            ? t.alerts.bellAriaUnread.replace("{count}", String(unreadCount))
            : t.alerts.bellAria
        }
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <BellIcon className="size-5" aria-hidden />
        {badge ? (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {panelOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.alerts.panelTitle}
          className="absolute top-full right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-black/8 bg-white shadow-[0_16px_40px_rgba(26,28,31,0.14)]"
        >
          <div className="flex items-center justify-between border-b border-black/6 px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">
              {t.alerts.panelTitle}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={pending}
                onClick={markAllRead}
                className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
              >
                {t.alerts.markAllRead}
              </button>
            ) : null}
          </div>

          {markFailed ? (
            <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
              {t.alerts.markFailed}
            </p>
          ) : null}

          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {recentNotifications.length ? (
              recentNotifications.map((item) => {
                const unread = !item.readAt;
                return (
                  <li
                    key={item.id}
                    className={`border-b border-black/5 px-3 py-3 last:border-b-0 ${
                      unread ? "bg-[#f5f8ff]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <NotificationDetailRows
                          details={item.details}
                          t={t}
                          compact
                        />
                        <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-ink-muted">
                          {item.body}
                        </p>
                        <p className="mt-1.5 text-[11px] text-ink-muted/80">
                          {new Date(item.createdAt).toLocaleString(
                            locale === "en" ? "en-US" : "ko-KR",
                          )}
                        </p>
                      </div>
                      {unread ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => markRead([item.id])}
                          className="shrink-0 rounded-md bg-brand px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
                        >
                          {t.alerts.ok}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-8 text-center text-sm text-ink-muted">
                {t.alerts.empty}
              </li>
            )}
          </ul>

          <div className="border-t border-black/6 px-3 py-2 text-center">
            <Link
              href="/account/notifications"
              onClick={() => setPanelOpen(false)}
              className="text-xs font-medium text-brand hover:underline"
            >
              {t.alerts.viewAll}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
