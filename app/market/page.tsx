import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { categoryLabel } from "@/lib/i18n/categories";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { locale, t } = await getI18n();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!configured) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-brand">
          {t.market.title}
        </h1>
        <p className="mt-4 text-ink-muted">{t.market.noConfig}</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  let query = supabase
    .from("listings")
    .select(
      "*, categories(*), listing_images(*), seller:profiles!listings_seller_id_fkey(nickname, full_name, email, is_anonymous)",
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (category) {
    const match = categories?.find((c) => c.slug === category);
    if (match) query = query.eq("category_id", match.id);
  }

  const { data: listings } = await query;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-brand sm:text-4xl">
            {t.market.title}
          </h1>
          <p className="mt-2 text-ink-muted">{t.market.blurb}</p>
        </div>
        <Link
          href="/sell"
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
        >
          <PlusIcon className="size-4" aria-hidden />
          {t.market.sellCta}
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/market"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !category
              ? "bg-brand text-white"
              : "bg-white/70 text-foreground hover:bg-white"
          }`}
        >
          {t.market.all}
        </Link>
        {(categories || []).map((cat) => (
          <Link
            key={cat.id}
            href={`/market?category=${cat.slug}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              category === cat.slug
                ? "bg-brand text-white"
                : "bg-white/70 text-foreground hover:bg-white"
            }`}
          >
            {categoryLabel(cat, locale)}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(listings as Listing[] | null)?.length ? (
          (listings as Listing[]).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        ) : (
          <p className="text-ink-muted sm:col-span-2 lg:col-span-3">
            {t.market.empty}
          </p>
        )}
      </div>
    </main>
  );
}
