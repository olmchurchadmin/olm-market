"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale-provider";

const MIN = 30;
const MAX = 100;

export function DonationPercentField({
  defaultValue = 30,
  defaultPrice = "",
}: {
  defaultValue?: number;
  defaultPrice?: string | number;
}) {
  const { t, locale } = useI18n();
  const initial = Math.min(MAX, Math.max(MIN, Math.round(defaultValue) || MIN));
  const [percent, setPercent] = useState(initial);
  const [price, setPrice] = useState(
    defaultPrice === "" || defaultPrice === undefined
      ? ""
      : String(defaultPrice),
  );

  const priceNum = Number(price);
  const hasPrice = price !== "" && Number.isFinite(priceNum) && priceNum >= 0;
  const donationAmount = hasPrice ? (priceNum * percent) / 100 : null;
  const sellerAmount =
    hasPrice && donationAmount !== null ? priceNum - donationAmount : null;

  const money = (n: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-US" : "ko-KR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        {t.sell.price}
        <span className="ml-0.5 text-red-600" aria-hidden>
          *
        </span>
        <span className="relative mt-1 block">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          >
            $
          </span>
          <input
            name="price"
            type="number"
            min="0"
            step="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-brand/15 bg-white py-2 pr-3 pl-7 outline-none focus:border-brand"
          />
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {t.sell.donationPercent}
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        </legend>
        <p className="text-xs text-ink-muted">{t.sell.donationHint}</p>

        <div className="rounded-xl border border-black/8 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-muted">{t.sell.donationToChurch}</span>
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-brand tabular-nums">
              {percent}%
            </span>
          </div>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={1}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--brand)]"
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuenow={percent}
            aria-label={t.sell.donationPercent}
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
            <span>{MIN}%</span>
            <span>{MAX}%</span>
          </div>
          <input type="hidden" name="donation_percent" value={percent} />
        </div>

        {hasPrice ? (
          <p className="text-xs leading-relaxed text-ink-muted">
            {t.sell.donationSplit
              .replace("{donation}", money(donationAmount || 0))
              .replace("{seller}", money(sellerAmount || 0))}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
