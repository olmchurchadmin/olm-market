import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyButton } from "@/components/buy-button";
import { ListingGallery } from "@/components/listing-gallery";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  formatPrice,
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
  const canBuy =
    listing.status === "available" && user?.id !== listing.seller_id;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/market"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        장터
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <ListingGallery
          title={listing.title}
          images={images}
          coverPath={listing.cover_image_path}
        />

        <div>
          <p className="text-sm font-medium tracking-wide text-brand-soft uppercase">
            {listing.categories?.name_ko}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-brand">
            {listing.title}
          </h1>
          <p className="mt-3 text-2xl font-semibold">
            {formatPrice(listing.price_cents)}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            상태: {listingStatusLabel(listing.status)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            판매자 · {publicSellerLabel(listing.seller)}
          </p>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground">
            {listing.description || "설명이 없습니다."}
          </p>

          <div className="mt-8 space-y-3 border-t border-brand/10 pt-6">
            {listing.status === "sold" ? (
              <p className="inline-flex rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">
                판매완료
              </p>
            ) : listing.status !== "available" ? (
              <p className="text-sm font-medium text-brand">
                이 물건은 현재 {listingStatusLabel(listing.status)} 상태입니다.
              </p>
            ) : !user ? (
              <Link
                href={`/login?next=/market/${listing.id}`}
                className="inline-flex rounded-md bg-sun px-5 py-3 text-sm font-semibold text-[#1c2a1f]"
              >
                로그인 후 Buy
              </Link>
            ) : (
              <BuyButton listingId={listing.id} disabled={!canBuy} />
            )}
            <p className="text-xs leading-relaxed text-ink-muted">
              Buy 후 판매자는 다음 주 성당에 물건을 맡기고, 구매자는 관리자에게
              현금 결제 후 픽업합니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
