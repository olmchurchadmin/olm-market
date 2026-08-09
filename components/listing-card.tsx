import Link from "next/link";
import type { Listing } from "@/lib/types";
import {
  formatPrice,
  listingImageUrl,
  listingStatusLabel,
  publicSellerLabel,
} from "@/lib/utils";

export function ListingCard({ listing }: { listing: Listing }) {
  const image = listingImageUrl(listing.cover_image_path);
  const soldLike =
    listing.status === "sold" ||
    listing.status === "reserved" ||
    listing.status === "at_church";

  return (
    <Link
      href={`/market/${listing.id}`}
      className="group block overflow-hidden rounded-lg border border-brand/10 bg-white/70 transition hover:-translate-y-0.5 hover:border-brand/25"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            No image
          </div>
        )}
        {soldLike ? (
          <span className="absolute left-3 top-3 rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white">
            {listingStatusLabel(listing.status)}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs font-medium tracking-wide text-brand-soft uppercase">
          {listing.categories?.name_ko || "기타"}
        </p>
        <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-lg text-brand">
          {listing.title}
        </h3>
        <p className="text-base font-semibold text-foreground">
          {formatPrice(listing.price_cents)}
        </p>
        <p className="text-xs text-ink-muted">
          판매자 · {publicSellerLabel(listing.seller)}
        </p>
      </div>
    </Link>
  );
}
