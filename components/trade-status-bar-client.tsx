"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { OrderTradeConfirmButton } from "@/components/order-trade-confirm-button";
import { useI18n } from "@/components/locale-provider";
import { loadTradeDockAction } from "@/lib/actions/trade-dock";
import { createClient } from "@/lib/supabase/client";
import type { TradeDockItem } from "@/lib/trade-status";
import {
  formatPrice,
  listingImageUrl,
  orderStatusLabel,
} from "@/lib/utils";

const DOCK_HEIGHT_VAR = "--trade-dock-h";
export const TRADE_DOCK_REFRESH_EVENT = "cm:trade-dock-refresh";

export function requestTradeDockRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TRADE_DOCK_REFRESH_EVENT));
}

export function TradeStatusBarClient({
  initialItems,
  userId,
}: {
  initialItems: TradeDockItem[];
  userId: string;
}) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const hideOnAdmin = pathname?.startsWith("/admin");
  const [items, setItems] = useState(initialItems);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const next = await loadTradeDockAction();
      setItems(next.items);
    } catch {
      // Keep the last known dock state.
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    const onEvent = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(TRADE_DOCK_REFRESH_EVENT, onEvent);
    const poll = window.setInterval(() => {
      void refresh();
    }, 12000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(TRADE_DOCK_REFRESH_EVENT, onEvent);
      window.clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trade-dock-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `buyer_id=eq.${userId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${userId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (hideOnAdmin || !items.length) {
      document.documentElement.style.removeProperty(DOCK_HEIGHT_VAR);
      return;
    }
    document.documentElement.style.setProperty(DOCK_HEIGHT_VAR, "5.75rem");
    return () => {
      document.documentElement.style.removeProperty(DOCK_HEIGHT_VAR);
    };
  }, [hideOnAdmin, items.length]);

  if (!items.length || hideOnAdmin) return null;

  const primary = items[0]!;
  const extra = items.length - 1;
  const thumb = listingImageUrl(primary.coverImagePath);
  const homePickup = primary.pickupMethod === "seller_location";
  const roleLabel =
    primary.role === "seller"
      ? t.account.tradeDockSelling
      : t.account.tradeDockBuying;
  const statusLine = orderStatusLabel(primary.status, t.status);
  const pickupLine = homePickup
    ? t.market.pickupSeller
    : t.market.pickupChurch;

  let hint: string | null = null;
  if (primary.action === "wait") {
    hint =
      primary.role === "seller"
        ? t.account.tradeDockWaitingBuyer
        : t.account.tradeDockWaitingSeller;
  } else if (primary.action === "share_pickup") {
    hint = t.account.tradeDockSharePickupHint;
  }

  return (
    <>
      <div className="h-[5.75rem] shrink-0" aria-hidden />
      <div
        role="region"
        aria-label={roleLabel}
        className="fixed inset-x-0 bottom-0 z-[55] border-t border-brand/15 bg-white/95 shadow-[0_-8px_24px_rgba(26,28,31,0.12)] backdrop-blur-md"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)] sm:size-14">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wide text-brand uppercase sm:text-xs">
              {roleLabel}
              {extra > 0
                ? ` · ${t.account.tradeDockMore.replace("{count}", String(extra))}`
                : null}
            </p>
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {primary.title}
              <span className="font-medium text-ink-muted">
                {" "}
                · {formatPrice(primary.priceCents, locale)}
              </span>
            </p>
            <p className="truncate text-xs text-ink-muted sm:text-sm">
              {statusLine} · {pickupLine}
              {hint ? ` · ${hint}` : null}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            {primary.action === "dropoff" ? (
              <OrderTradeConfirmButton
                orderId={primary.orderId}
                action="dropoff"
              />
            ) : null}
            {primary.action === "pickup" ? (
              <OrderTradeConfirmButton
                orderId={primary.orderId}
                action="pickup"
                homePickup={homePickup}
              />
            ) : null}
            {primary.action === "share_pickup" ? (
              <Link
                href="/account/transactions"
                className="inline-flex items-center rounded-md border border-brand/20 bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft sm:px-3 sm:py-2 sm:text-sm"
              >
                {t.account.pickupShareCta}
              </Link>
            ) : null}
            <Link
              href="/account/transactions"
              className="text-[11px] font-medium text-ink-muted underline-offset-2 hover:text-foreground hover:underline sm:text-xs"
            >
              {t.account.tradeDockViewAll}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
