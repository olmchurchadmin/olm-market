"use client";

import { ShoppingBagIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { requestTradeDockRefresh } from "@/components/trade-status-bar-client";
import { buyListingAction } from "@/lib/actions/orders";
import { removeFromWatchlistAction } from "@/lib/actions/watchlist";
import type { Listing } from "@/lib/types";
import {
  formatPrice,
  listingImageUrl,
  listingQuantityRemaining,
  listingStatusBadgeClass,
  listingStatusLabel,
} from "@/lib/utils";

export function WatchlistRow({ listing }: { listing: Listing }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { locale, t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pendingBuy, startBuy] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const thumb = listingImageUrl(listing.cover_image_path);
  const remaining = listingQuantityRemaining(listing);
  const canBuy = listing.status === "available" && remaining > 0;

  return (
    <li className="flex flex-col gap-3 rounded-md border border-brand/10 bg-white/70 p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <Link
          href={`/market/${listing.id}`}
          className="relative size-16 shrink-0 overflow-hidden rounded-md bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)] sm:size-20"
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-muted">
              {t.market.noImage}
            </span>
          )}
        </Link>
        <div className="min-w-0">
          <Link
            href={`/market/${listing.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {listing.title}
          </Link>
          <p className="mt-0.5 text-sm text-ink-muted">
            {formatPrice(listing.price_cents, locale)}
          </p>
          {canBuy ? null : (
            <p className="mt-1 text-xs text-ink-muted">
              <span
                className={`mr-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${listingStatusBadgeClass(listing.status)}`}
              >
                {listingStatusLabel(listing.status, t.status)}
              </span>
              {t.account.watchlistUnavailable}
            </p>
          )}
          {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canBuy ? (
          <button
            type="button"
            disabled={pendingBuy}
            onClick={async () => {
              const ok = await confirm({
                title: t.buy.confirmTitle,
                message: t.buy.confirmMessage,
                confirmLabel: t.buy.confirmCta,
                cancelLabel: t.common.cancel,
              });
              if (!ok) return;
              setError(null);
              startBuy(async () => {
                const result = await buyListingAction(listing.id, 1);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                requestTradeDockRefresh();
                router.push("/account/transactions");
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
          >
            <ShoppingBagIcon className="size-3.5" aria-hidden />
            {pendingBuy ? t.buy.working : t.buy.cta}
          </button>
        ) : null}
        <button
          type="button"
          disabled={pendingRemove}
          onClick={() => {
            setHidden(true);
            startRemove(async () => {
              const result = await removeFromWatchlistAction(listing.id);
              if (!result.ok) {
                setHidden(false);
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/15 bg-white px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <TrashIcon className="size-3.5" aria-hidden />
          {pendingRemove ? t.common.loading : t.account.watchlistRemoveCta}
        </button>
      </div>
    </li>
  );
}
