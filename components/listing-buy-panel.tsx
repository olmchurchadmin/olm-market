"use client";

import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { buyListingAction } from "@/lib/actions/orders";
import { formatPrice, itemConditionLabel } from "@/lib/utils";

export function ListingBuyPanel({
  listingId,
  condition,
  unitPriceCents,
  remaining,
  total,
  canBuy,
  isLoggedIn,
  loginHref,
  buyHint,
}: {
  listingId: string;
  condition?: string | null;
  unitPriceCents: number;
  remaining: number;
  total: number;
  canBuy: boolean;
  isLoggedIn: boolean;
  loginHref: string;
  buyHint: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { locale, t } = useI18n();
  const sold = Math.max(0, total - remaining);
  const maxQty = Math.max(1, remaining);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const safeQty = useMemo(() => {
    const n = Math.floor(Number(qty) || 1);
    return Math.min(maxQty, Math.max(1, n));
  }, [qty, maxQty]);

  const lineTotal = formatPrice(unitPriceCents * safeQty, locale);
  const stockLabel = t.market.quantityAvailableSold
    .replace("{available}", String(remaining))
    .replace("{sold}", String(sold));
  const showQuantity = total > 1;

  return (
    <div className="mt-8 space-y-5">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-ink-muted">{t.market.condition}:</span>
          <span className="font-semibold text-foreground">
            {itemConditionLabel(condition, t.condition)}
          </span>
        </div>

        {showQuantity ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="inline-flex items-center gap-2 text-ink-muted">
              <span>{t.market.quantity}:</span>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={safeQty}
                disabled={!canBuy || remaining < 1}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
                className="w-16 rounded-md border border-brand/20 bg-white px-2 py-1.5 text-center text-sm font-medium text-foreground outline-none focus:border-brand disabled:opacity-50"
              />
            </label>
            <span className="text-ink-muted">{stockLabel}</span>
          </div>
        ) : null}

        {showQuantity && safeQty > 1 ? (
          <p className="text-sm font-semibold text-foreground">
            {lineTotal}
          </p>
        ) : null}
      </div>

      {!isLoggedIn ? (
        <Link
          href={loginHref}
          className="inline-flex rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
        >
          {t.market.loginToBuy}
        </Link>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            disabled={!canBuy || pending || remaining < 1}
            onClick={async () => {
              const ok = await confirm({
                title: t.buy.confirmTitle,
                message: t.buy.confirmMessage,
                confirmLabel: t.buy.confirmCta,
                cancelLabel: t.common.cancel,
              });
              if (!ok) return;

              setError(null);
              startTransition(async () => {
                const result = await buyListingAction(listingId, safeQty);
                if (!result.ok) {
                  if (
                    result.error === t.errors.loginRequired ||
                    result.error.includes("로그인") ||
                    result.error.toLowerCase().includes("log in") ||
                    result.error.toLowerCase().includes("sign in")
                  ) {
                    router.push(loginHref);
                    return;
                  }
                  setError(result.error);
                  return;
                }
                router.push("/account/transactions");
              });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <ShoppingBagIcon className="size-5" aria-hidden />
            {pending ? t.buy.working : t.buy.cta}
          </button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink-muted">{buyHint}</p>
    </div>
  );
}
