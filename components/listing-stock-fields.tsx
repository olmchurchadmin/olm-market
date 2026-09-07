"use client";

import { useI18n } from "@/components/locale-provider";
import type { ItemCondition } from "@/lib/types";

export function ListingStockFields({
  defaultQuantity = 1,
  defaultCondition = "used",
}: {
  defaultQuantity?: number;
  defaultCondition?: ItemCondition;
}) {
  const { t } = useI18n();
  const quantity = Math.min(99, Math.max(1, Math.floor(defaultQuantity) || 1));
  const condition: ItemCondition =
    defaultCondition === "new" ? "new" : "used";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-medium">
        {t.sell.quantity}
        <span className="ml-0.5 text-red-600" aria-hidden>
          *
        </span>
        <input
          name="quantity"
          type="number"
          required
          min={1}
          max={99}
          defaultValue={quantity}
          className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
        />
        <span className="mt-1 block text-xs font-normal text-ink-muted">
          {t.sell.quantityHint}
        </span>
      </label>

      <fieldset className="block text-sm font-medium">
        <legend>
          {t.sell.condition}
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-brand/15 bg-white px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
            <input
              type="radio"
              name="item_condition"
              value="new"
              defaultChecked={condition === "new"}
              required
              className="accent-[var(--brand)]"
            />
            <span>{t.sell.conditionNew}</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-brand/15 bg-white px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
            <input
              type="radio"
              name="item_condition"
              value="used"
              defaultChecked={condition === "used"}
              className="accent-[var(--brand)]"
            />
            <span>{t.sell.conditionUsed}</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
