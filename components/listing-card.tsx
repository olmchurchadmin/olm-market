"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";
import { categoryLabel } from "@/lib/i18n/categories";
import type { Listing } from "@/lib/types";
import {
  formatPrice,
  listingImageUrl,
  listingStatusLabel,
  publicSellerLabel,
} from "@/lib/utils";

export function ListingCard({ listing }: { listing: Listing }) {
  const { locale, t } = useI18n();
  const image = listingImageUrl(listing.cover_image_path);
  const soldLike =
    listing.status === "sold" ||
    listing.status === "reserved" ||
    listing.status === "at_church";

  return (
    <Link
      href={`/market/${listing.id}`}
      className="group block overflow-hidden rounded-md border border-black/6 bg-white shadow-[0_8px_24px_rgba(26,28,31,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-black/12 hover:shadow-[0_14px_36px_rgba(26,28,31,0.08)]"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={listing.title}
            className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
            {t.market.noImage}
          </div>
        )}
        {soldLike ? (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-brand px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:left-3 sm:top-3 sm:text-xs">
            {listingStatusLabel(listing.status, t.status)}
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5 p-2.5 sm:space-y-1 sm:p-3.5">
        <p className="truncate text-[10px] font-medium tracking-wide text-ink-muted uppercase sm:text-xs">
          {categoryLabel(listing.categories, locale)}
        </p>
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm text-foreground sm:text-base">
          {listing.title}
        </h3>
        <p className="text-sm font-semibold text-foreground sm:text-base">
          {formatPrice(listing.price_cents, locale)}
        </p>
        <p className="truncate text-[10px] text-ink-muted sm:text-xs">
          {t.market.donation}{" "}
          {t.market.donationValue.replace(
            "{percent}",
            String(
              Math.min(
                100,
                Math.max(30, Math.round(listing.donation_percent ?? 100)),
              ),
            ),
          )}
        </p>
        <p className="truncate text-[10px] text-ink-muted sm:text-xs">
          {listing.pickup_method === "seller_location"
            ? t.market.pickupSeller
            : t.market.pickupChurch}
        </p>
        <p className="truncate text-[10px] text-ink-muted sm:text-xs">
          {t.market.seller} ·{" "}
          {publicSellerLabel(listing.seller, {
            seller: t.market.seller,
            anonymous: t.market.anonymous,
          })}
        </p>
      </div>
    </Link>
  );
}
