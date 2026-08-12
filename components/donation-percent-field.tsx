"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale-provider";

const OPTIONS = [100, 90, 80, 70, 60, 50, 40, 30] as const;

function nearestOption(value: number) {
  if (OPTIONS.includes(value as (typeof OPTIONS)[number])) return value;
  return OPTIONS.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best,
  );
}

export function DonationPercentField({
  defaultValue = 100,
  defaultPrice = "",
}: {
  defaultValue?: number;
  defaultPrice?: string | number;
}) {
  const { t, locale } = useI18n();
  const initial = nearestOption(
    Math.min(100, Math.max(30, Math.round(defaultValue) || 100)),
  );
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

        <div
          className="grid grid-cols-4 gap-2"
          role="radiogroup"
          aria-label={t.sell.donationPercent}
        >
          {OPTIONS.map((option) => {
            const selected = percent === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPercent(option)}
                className={`rounded-xl px-2 py-2.5 text-sm font-semibold tabular-nums transition ${
                  selected
                    ? "bg-brand text-sun shadow-sm"
                    : "border border-black/8 bg-white text-foreground hover:border-brand/30 hover:bg-brand/5"
                }`}
              >
                {option}%
              </button>
            );
          })}
        </div>
        <input type="hidden" name="donation_percent" value={percent} />

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
