"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { useI18n } from "@/components/locale-provider";
import type { Listing } from "@/lib/types";
import {
  formatPrice,
  listingImageUrl,
  listingStatusLabel,
} from "@/lib/utils";

export function SellingListingRow({ listing }: { listing: Listing }) {
  const { locale, t } = useI18n();
  const thumb = listingImageUrl(listing.cover_image_path);
  const canManage =
    listing.status === "available" || listing.status === "cancelled";

  return (
    <li className="flex gap-3 rounded-md border border-brand/10 bg-white/70 p-3">
      <Link
        href={`/market/${listing.id}`}
        className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)] sm:size-20"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-ink-muted">
            {t.market.noImage}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/market/${listing.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {listing.title}
        </Link>
        <p className="text-sm text-ink-muted">
          {formatPrice(listing.price_cents, locale)} ·{" "}
          {listingStatusLabel(listing.status, t.status)}
        </p>

        {canManage ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/sell/${listing.id}/edit`}
              className="inline-flex items-center gap-1 rounded-md border border-brand/15 bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-brand/5"
            >
              <PencilSquareIcon className="size-3.5" aria-hidden />
              {t.account.edit}
            </Link>
            <DeleteListingButton listingId={listing.id} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
