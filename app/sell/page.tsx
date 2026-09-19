import { DonationPercentField } from "@/components/donation-percent-field";
import { ListingForm } from "@/components/listing-form";
import { ListingStockFields } from "@/components/listing-stock-fields";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { PickupMethodField } from "@/components/pickup-method-field";
import { SelectField } from "@/components/ui/select-field";
import { createListingAction } from "@/lib/actions/listings";
import { categoryLabel } from "@/lib/i18n/categories";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale, t } = await getI18n();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-foreground">
        {t.sell.title}
      </h1>
      <p className="mt-2 text-ink-muted">{t.sell.blurb}</p>

      <ListingForm
        action={createListingAction}
        initialError={error || null}
        photoTotalTooLarge={t.sell.photoTotalTooLarge}
        photoStillTooLarge={t.sell.photoStillTooLarge}
      >
        <label className="block text-sm font-medium">
          {t.sell.titleLabel}
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
          <input
            name="title"
            required
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
          <span className="mt-1 block text-xs font-normal text-ink-muted">
            {t.sell.autoTranslateHint}
          </span>
        </label>

        <SelectField
          label={t.sell.category}
          name="category_id"
          required
          requiredMark
          defaultValue=""
          placeholder={t.sell.select}
          options={(categories || []).map((cat) => ({
            value: cat.id,
            label: categoryLabel(cat, locale),
          }))}
        />

        <ListingStockFields />

        <DonationPercentField />

        <PickupMethodField />

        <label className="block text-sm font-medium">
          {t.sell.description}
          <textarea
            name="description"
            rows={5}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <FileUploadField
          label={t.sell.photos}
          name="images"
          hint={t.sell.photosHint}
        />

        <PendingSubmitButton pendingLabel={t.common.loading}>
          {t.sell.submit}
        </PendingSubmitButton>
      </ListingForm>
    </main>
  );
}
