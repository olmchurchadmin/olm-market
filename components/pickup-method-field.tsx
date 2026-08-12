"use client";

import { useI18n } from "@/components/locale-provider";
import type { PickupMethod } from "@/lib/types";

export function PickupMethodField({
  defaultValue = "church",
}: {
  defaultValue?: PickupMethod;
}) {
  const { t } = useI18n();

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
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/8 bg-white px-3 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
          <input
            type="radio"
            name="pickup_method"
            value="church"
            defaultChecked={defaultValue === "church"}
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
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/8 bg-white px-3 py-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
          <input
            type="radio"
            name="pickup_method"
            value="seller_location"
            defaultChecked={defaultValue === "seller_location"}
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
    </fieldset>
  );
}
