"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale-provider";
import type { PickupMethod } from "@/lib/types";

export function PickupMethodField({
  defaultValue = "church",
  defaultAddress = "",
  defaultPhone = "",
}: {
  defaultValue?: PickupMethod;
  defaultAddress?: string;
  defaultPhone?: string;
}) {
  const { t } = useI18n();
  const [method, setMethod] = useState<PickupMethod>(defaultValue);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {t.sell.pickupMethod}
        <span className="ml-0.5 text-red-600" aria-hidden>
          *
        </span>
      </legend>
      <p className="text-xs text-ink-muted">{t.sell.pickupHint}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-black/8 bg-white px-3 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
          <input
            type="radio"
            name="pickup_method"
            value="church"
            checked={method === "church"}
            onChange={() => setMethod("church")}
            required
            className="mt-1 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              {t.sell.pickupChurch}
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {t.sell.pickupChurchHint}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-black/8 bg-white px-3 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
          <input
            type="radio"
            name="pickup_method"
            value="seller_location"
            checked={method === "seller_location"}
            onChange={() => setMethod("seller_location")}
            className="mt-1 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              {t.sell.pickupSeller}
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {t.sell.pickupSellerHint}
            </span>
          </span>
        </label>
      </div>

      {method === "seller_location" ? (
        <div className="space-y-3 rounded-md border border-brand/15 bg-brand/[0.03] p-3">
          <p className="text-xs text-ink-muted">{t.sell.pickupContactHint}</p>
          <label className="block text-sm font-medium">
            {t.sell.pickupAddress}
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
            <textarea
              name="pickup_address"
              required
              rows={2}
              defaultValue={defaultAddress}
              placeholder={t.sell.pickupAddressPlaceholder}
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            {t.sell.pickupPhone}
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
            <input
              name="pickup_phone"
              type="tel"
              required
              defaultValue={defaultPhone}
              placeholder={t.sell.pickupPhonePlaceholder}
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
