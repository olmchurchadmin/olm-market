"use client";

import Link from "next/link";
import { useEffect } from "react";
import { OrderTradeConfirmButton } from "@/components/order-trade-confirm-button";
import { useI18n } from "@/components/locale-provider";
import type { TradeDockItem } from "@/lib/trade-status";
import {
  formatPrice,
  listingImageUrl,
  orderStatusLabel,
} from "@/lib/utils";

const DOCK_HEIGHT_VAR = "--trade-dock-h";

export function TradeStatusBarClient({ items }: { items: TradeDockItem[] }) {
  const { locale, t } = useI18n();

  useEffect(() => {
    document.documentElement.style.setProperty(DOCK_HEIGHT_VAR, "5.75rem");
    return () => {
      document.documentElement.style.removeProperty(DOCK_HEIGHT_VAR);
    };
  }, []);

  if (!items.length) return null;

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
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2.5 sm:px-4">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]">
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
            <p className="text-[11px] font-semibold tracking-wide text-brand uppercase">
              {roleLabel}
              {extra > 0
                ? ` · ${t.account.tradeDockMore.replace("{count}", String(extra))}`
                : null}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {primary.title}
              <span className="font-medium text-ink-muted">
                {" "}
                · {formatPrice(primary.priceCents, locale)}
              </span>
            </p>
            <p className="truncate text-xs text-ink-muted">
              {statusLine} · {pickupLine}
              {hint ? ` · ${hint}` : null}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
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
                className="inline-flex items-center rounded-md border border-brand/20 bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft"
              >
                {t.account.pickupShareCta}
              </Link>
            ) : (
              <Link
                href="/account/transactions"
                className="text-[11px] font-medium text-ink-muted underline-offset-2 hover:text-foreground hover:underline"
              >
                {t.account.tradeDockViewAll}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
