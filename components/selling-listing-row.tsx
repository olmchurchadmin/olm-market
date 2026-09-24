"use client";

import { ArrowPathIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { useI18n } from "@/components/locale-provider";
import {
  relistListingAction,
  setListingSellerStatusAction,
} from "@/lib/actions/listings";
import { listingTitle } from "@/lib/i18n/listings";
import type { Listing, SellerListingBucket } from "@/lib/types";
import {
  formatPrice,
  itemConditionLabel,
  listingImageUrl,
  listingQuantityRemaining,
  listingQuantityTotal,
  listingSellerBucket,
} from "@/lib/utils";

export function SellingListingRow({ listing }: { listing: Listing }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const title = listingTitle(listing, locale);
  const thumb = listingImageUrl(listing.cover_image_path);
  const bucket = listingSellerBucket(listing.status);
  const midTrade =
    listing.status === "reserved" || listing.status === "at_church";
  const canManage =
    listing.status === "available" ||
    listing.status === "draft" ||
    listing.status === "cancelled" ||
    listing.status === "sold";
  const canRelist = listing.status === "sold";
  const detailHref =
    bucket === "draft" ? `/sell/${listing.id}/edit` : `/market/${listing.id}`;
  const remaining = listingQuantityRemaining(listing);
  const total = listingQuantityTotal(listing);

  function applyBucket(next: SellerListingBucket) {
    if (next === bucket || pending) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listing_id", listing.id);
      fd.set("bucket", next);
      const result = await setListingSellerStatusAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex gap-3 rounded-md border border-brand/10 bg-white/70 p-3">
      <Link
        href={detailHref}
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

      <div className="min-w-0 flex-1">
        <Link
          href={detailHref}
          className="font-medium text-foreground hover:underline"
        >
          {title}
        </Link>
        <p className="text-sm text-ink-muted">
          {formatPrice(listing.price_cents, locale)} ·{" "}
          {itemConditionLabel(listing.item_condition, t.condition)}
          {total > 1
            ? ` · ${t.market.quantityRemainingOf
                .replace("{remaining}", String(remaining))
                .replace("{total}", String(total))}`
            : ""}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <span className="sr-only">{t.account.sellerStatusLabel}</span>
            <select
              value={bucket}
              disabled={pending || midTrade}
              onChange={(event) =>
                applyBucket(event.target.value as SellerListingBucket)
              }
              className="rounded-md border border-brand/15 bg-white px-2 py-1 text-xs font-semibold text-foreground outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t.account.sellerStatusLabel}
            >
              <option value="draft">{t.account.sellerStatusDraft}</option>
              <option value="published">
                {t.account.sellerStatusPublished}
              </option>
              <option value="completed">
                {t.account.sellerStatusCompleted}
              </option>
            </select>
          </label>

          {canManage ? (
            <>
              <Link
                href={`/sell/${listing.id}/edit`}
                className="inline-flex items-center gap-1 rounded-md border border-brand/15 bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-brand/5"
              >
                <PencilSquareIcon className="size-3.5" aria-hidden />
                {t.account.edit}
              </Link>
              {listing.status !== "sold" &&
              listing.status !== "reserved" &&
              listing.status !== "at_church" ? (
                <DeleteListingButton listingId={listing.id} />
              ) : null}
            </>
          ) : null}

          {canRelist ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const ok = await confirm({
                    title: t.account.relistTitle,
                    message: t.account.relistMessage,
                    confirmLabel: t.account.relist,
                    cancelLabel: t.common.cancel,
                  });
                  if (!ok) return;
                  setError(null);
                  const fd = new FormData();
                  fd.set("listing_id", listing.id);
                  const result = await relistListingAction(fd);
                  if (!result.ok) {
                    setError(result.error || t.account.relistFailed);
                    return;
                  }
                  router.refresh();
                });
              }}
              className="inline-flex items-center gap-1 rounded-md border border-brand/15 bg-brand/5 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-60"
            >
              <ArrowPathIcon className="size-3.5" aria-hidden />
              {t.account.relist}
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-2 text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {midTrade ? (
          <p className="mt-1 text-xs text-ink-muted">
            {t.status[listing.status as "reserved" | "at_church"]}
          </p>
        ) : null}
      </div>
    </li>
  );
}
