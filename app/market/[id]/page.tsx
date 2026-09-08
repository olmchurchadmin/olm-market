import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingBuyPanel } from "@/components/listing-buy-panel";
import { ListingGallery } from "@/components/listing-gallery";
import { WatchlistButton } from "@/components/watchlist-button";
import { getSessionUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/i18n/categories";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import {
  formatListingPublicId,
  formatPrice,
  listingQuantityRemaining,
  listingQuantityTotal,
  listingStatusBadgeClass,
  listingStatusLabel,
  publicSellerLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const supabase = await createClient();
  const user = await getSessionUser();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "*, categories(*), listing_images(*), seller:profiles!listings_seller_id_fkey(nickname, full_name, email, is_anonymous)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!listing) notFound();

  const images = (listing.listing_images || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order,
  );
  const remaining = listingQuantityRemaining(listing);
  const total = listingQuantityTotal(listing);
  const canBuy =
    listing.status === "available" &&
    remaining > 0 &&
    user?.id !== listing.seller_id;
  const isOwnListing = Boolean(user && user.id === listing.seller_id);

  let initialWatched = false;
  if (user && !isOwnListing) {
    const { data: watched } = await supabase
      .from("watchlist")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle();
    initialWatched = Boolean(watched);
  }

  const statusLabel = listingStatusLabel(listing.status, t.status);
  const pickupMethod =
    listing.pickup_method === "seller_location" ? "seller_location" : "church";
  const pickupLabel =
    pickupMethod === "seller_location"
      ? t.market.pickupSeller
      : t.market.pickupChurch;
  const buyHint = isOwnListing
    ? t.market.ownListingHint
    : pickupMethod === "seller_location"
      ? t.market.buyHintSeller
      : t.market.buyHintChurch;
  const donationPercent = Math.min(
    100,
    Math.max(30, Math.round(listing.donation_percent ?? 100)),
  );

  const statusAction =
    listing.status === "reserved"
      ? { label: statusLabel, hint: t.market.reservedHint }
      : listing.status === "at_church"
        ? { label: statusLabel, hint: t.market.atChurchHint }
        : listing.status === "sold"
          ? { label: statusLabel, hint: t.market.soldHint }
          : null;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        {t.market.back}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <ListingGallery
          title={listing.title}
          images={images}
          coverPath={listing.cover_image_path}
        />

        <div>
          <p className="text-sm font-medium tracking-wide text-ink-muted uppercase">
            {categoryLabel(listing.categories, locale)}
          </p>
          <h1 className="mt-2 break-words font-[family-name:var(--font-display)] text-3xl text-foreground sm:text-4xl">
            {listing.title}
          </h1>
          <p className="mt-3 text-2xl font-semibold">
            {formatPrice(listing.price_cents, locale)}
          </p>
          <p className="mt-2 font-mono text-sm text-ink-muted" title={listing.id}>
            ID: {formatListingPublicId(listing.id)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {t.market.donation}:{" "}
            {t.market.donationValue.replace("{percent}", String(donationPercent))}
          </p>
          {listing.status === "available" ? (
            <p className="mt-1 text-sm text-ink-muted">
              {t.market.status}: {statusLabel}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-ink-muted">
            {t.market.pickup}: {pickupLabel}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {t.market.seller}:{" "}
            {publicSellerLabel(listing.seller, {
              seller: t.market.seller,
              anonymous: t.market.anonymous,
            })}
          </p>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground">
            {listing.description || t.market.noDescription}
          </p>

          {listing.status === "available" && remaining > 0 ? (
            <ListingBuyPanel
              listingId={listing.id}
              condition={listing.item_condition}
              unitPriceCents={listing.price_cents}
              remaining={remaining}
              total={total}
              canBuy={canBuy}
              isLoggedIn={Boolean(user)}
              loginHref={`/login?next=/market/${listing.id}`}
              buyHint={buyHint}
              initialWatched={initialWatched}
              showWatchlist={!isOwnListing}
            />
          ) : statusAction ? (
            <div className="mt-8 space-y-3">
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-ink-muted">{t.market.condition}:</span>
                  <span className="font-semibold text-foreground">
                    {listing.item_condition === "new"
                      ? t.condition.new
                      : t.condition.used}
                  </span>
                </div>
                {total > 1 ? (
                  <p className="text-ink-muted">
                    {t.market.quantity}:{" "}
                    {t.market.quantityAvailableSold
                      .replace("{available}", String(remaining))
                      .replace(
                        "{sold}",
                        String(Math.max(0, total - remaining)),
                      )}
                  </p>
                ) : null}
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${listingStatusBadgeClass(listing.status)}`}
              >
                {statusAction.label}
              </span>
              <p className="max-w-md text-xs leading-relaxed text-ink-muted">
                {statusAction.hint}
              </p>
              {!isOwnListing ? (
                <WatchlistButton
                  listingId={listing.id}
                  initialWatched={initialWatched}
                  isLoggedIn={Boolean(user)}
                  loginHref={`/login?next=/market/${listing.id}`}
                />
              ) : null}
            </div>
          ) : !isOwnListing && listing.status !== "cancelled" ? (
            <div className="mt-8">
              <WatchlistButton
                listingId={listing.id}
                initialWatched={initialWatched}
                isLoggedIn={Boolean(user)}
                loginHref={`/login?next=/market/${listing.id}`}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
