"use client";

import { BellIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/locale-provider";
import { NotificationDetailRows } from "@/components/notification-detail-rows";
import { SharePickupDetails } from "@/components/share-pickup-details";
import { useNotifications } from "@/components/notifications-provider";
import { notificationActionHref } from "@/lib/notification-links";

export function NotificationBell() {
  const { t, locale } = useI18n();
  const {
    enabled,
    unreadCount,
    recentNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    pending,
    markFailed,
    dismissToast,
  } = useNotifications();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Per instance, not shared: the nav renders one bell for desktop and one for
  // mobile. Sharing this state left both panels open, so each one treated
  // clicks inside the other as an outside click and closed the panel before
  // the click could reach the button or link under the cursor.
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const toggleDeleteConfirm = useCallback((id: string) => {
    setConfirmDeleteId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const button = rootRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const margin = 12;
    const gap = 8;
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      setPanelStyle({
        position: "fixed",
        top: Math.max(margin, rect.bottom + gap),
        left: margin,
        right: margin,
        width: "auto",
      });
      return;
    }

    const width = Math.min(22 * 16, window.innerWidth - margin * 2);
    let left = rect.right - width;
    left = Math.min(left, window.innerWidth - margin - width);
    left = Math.max(margin, left);

    setPanelStyle({
      position: "fixed",
      top: Math.max(margin, rect.bottom + gap),
      left,
      width,
      right: "auto",
    });
  }, []);

  useLayoutEffect(() => {
    if (!panelOpen) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [panelOpen, updatePanelPosition]);

  useEffect(() => {
    if (!panelOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setPanelOpen(false);
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
  }, [panelOpen]);

  if (!enabled) return null;

  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;
  const pickupDetailOrderIds = new Set(
    recentNotifications
      .filter((item) => item.type === "order_pickup_details")
      .map((item) => item.payload?.order_id)
      .filter(Boolean) as string[],
  );

  function canSharePickupDetails(item: (typeof recentNotifications)[number]) {
    return (
      item.type === "order_reserved" &&
      item.payload?.role === "seller" &&
      item.payload?.pickup_method === "seller_location" &&
      typeof item.payload?.order_id === "string"
    );
  }

  function openPanel() {
    dismissToast();
    setPanelOpen(true);
  }

  const panel =
    panelOpen && mounted
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={t.alerts.panelTitle}
            style={panelStyle}
            className="z-[60] overflow-hidden rounded-md border border-black/8 bg-white shadow-[0_16px_40px_rgba(26,28,31,0.14)]"
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

            <ul className="max-h-[min(20rem,calc(100dvh-9rem))] overflow-y-auto overscroll-contain">
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
                      <div className="flex flex-col gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold break-words text-foreground">
                            {item.title}
                          </p>
                          <NotificationDetailRows
                            details={item.details}
                            t={t}
                            compact
                          />
                          <p className="mt-1 text-xs leading-relaxed break-words whitespace-pre-line text-ink-muted">
                            {item.body}
                          </p>
                          <p className="mt-1.5 text-[11px] text-ink-muted/80">
                            {new Date(item.createdAt).toLocaleString(
                              locale === "en" ? "en-US" : "ko-KR",
                            )}
                          </p>
                          {canSharePickupDetails(item) ? (
                            <SharePickupDetails
                              orderId={item.payload!.order_id!}
                              defaultContact=""
                              alreadySent={pickupDetailOrderIds.has(
                                item.payload!.order_id!,
                              )}
                              compact
                            />
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <div
                            className={`flex items-center gap-1.5 transition-all duration-200 ${
                              confirmDeleteId === item.id
                                ? "max-w-[10rem] opacity-100"
                                : "max-w-0 overflow-hidden opacity-0 pointer-events-none"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="whitespace-nowrap text-[11px] font-medium text-ink-muted hover:text-foreground"
                            >
                              {t.common.cancel}
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                setConfirmDeleteId(null);
                                deleteNotification(item.id);
                              }}
                              className="whitespace-nowrap text-[11px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {t.common.confirm}
                            </button>
                          </div>
                          {unread ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                const href = notificationActionHref(
                                  item.type,
                                  item.payload?.event,
                                  item.payload?.listing_id,
                                );
                                markRead([item.id]);
                                setPanelOpen(false);
                                if (href) {
                                  // Hard navigate: markRead's transition can cancel router.push.
                                  window.location.assign(href);
                                }
                              }}
                              className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
                            >
                              {t.alerts.ok}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => toggleDeleteConfirm(item.id)}
                            className="rounded-md p-1 text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label={t.alerts.deleteAria}
                          >
                            <TrashIcon className="size-3.5" aria-hidden />
                          </button>
                        </div>
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
          </div>,
          document.body,
        )
      : null;

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
        onClick={() => {
          if (panelOpen) {
            setPanelOpen(false);
          } else {
            openPanel();
          }
        }}
      >
        <BellIcon className="size-5" aria-hidden />
        {badge ? (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
