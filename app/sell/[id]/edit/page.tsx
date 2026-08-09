import { PencilSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { SelectField } from "@/components/ui/select-field";
import { updateListingAction } from "@/lib/actions/listings";
import { getSessionUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/i18n/categories";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=/sell/${id}/edit`);
  }

  const supabase = await createClient();
  const [{ data: listing }, { data: categories }] = await Promise.all([
    supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  if (!listing || listing.seller_id !== user.id) notFound();
  if (listing.status !== "available" && listing.status !== "cancelled") {
    redirect(
      `/account/transactions?error=${encodeURIComponent(t.sell.cannotEditActive)}`,
    );
  }

  const images = (listing.listing_images || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order,
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-4xl text-brand">
        <PencilSquareIcon className="size-8" aria-hidden />
        {t.sell.editTitle}
      </h1>
      <p className="mt-2 text-ink-muted">{t.sell.editBlurb}</p>

      <form action={updateListingAction} className="mt-8 space-y-5">
        <input type="hidden" name="listing_id" value={listing.id} />

        <label className="block text-sm font-medium">
          {t.sell.titleLabel}
          <input
            name="title"
            required
            defaultValue={listing.title}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <SelectField
          label={t.sell.category}
          name="category_id"
          required
          defaultValue={listing.category_id}
          placeholder=""
          options={(categories || []).map((cat) => ({
            value: cat.id,
            label: categoryLabel(cat, locale),
          }))}
        />

        <label className="block text-sm font-medium">
          {t.sell.price}
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
              defaultValue={Math.round(listing.price_cents / 100)}
              className="w-full rounded-md border border-brand/15 bg-white py-2 pr-3 pl-7 outline-none focus:border-brand"
            />
          </span>
        </label>

        <label className="block text-sm font-medium">
          {t.sell.description}
          <textarea
            name="description"
            rows={5}
            defaultValue={listing.description || ""}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <FileUploadField
          label={t.sell.photos}
          name="images"
          hint={t.sell.photosEditHint}
          existingImages={images}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            {t.sell.save}
          </button>
          <Link
            href="/account/transactions"
            className="rounded-md border border-brand/15 bg-white px-5 py-3 text-sm font-medium text-brand hover:bg-brand/5"
          >
            {t.sell.cancel}
          </Link>
        </div>
      </form>
    </main>
  );
}
