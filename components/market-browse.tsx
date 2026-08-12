import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { categoryLabel } from "@/lib/i18n/categories";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

function sanitizeSearch(value: string) {
  return value.trim().replace(/[%_,]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

function hrefFor(params: { category?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export async function MarketBrowse({
  category,
  q,
}: {
  category?: string;
  q?: string;
}) {
  const { locale, t } = await getI18n();
  const queryText = sanitizeSearch(q || "");
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!configured) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-foreground">
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

  if (queryText) {
    query = query.or(
      `title.ilike.%${queryText}%,description.ilike.%${queryText}%`,
    );
  }

  const { data: listings } = await query;
  const rows = (listings as Listing[] | null) || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <form
        action="/"
        method="get"
        className="animate-rise flex gap-2 rounded-2xl border border-black/6 bg-white/85 p-2 shadow-[0_10px_30px_rgba(26,28,31,0.05)] backdrop-blur-sm"
      >
        {category ? (
          <input type="hidden" name="category" value={category} />
        ) : null}
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t.market.search}</span>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={queryText}
            placeholder={t.market.searchPlaceholder}
            className="w-full rounded-xl border-0 bg-transparent py-2.5 pr-3 pl-10 text-sm outline-none placeholder:text-ink-muted/80 focus:ring-0"
          />
        </label>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-soft"
        >
          {t.market.search}
        </button>
        <Link
          href="/sell"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-black/8 bg-white px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-[#f7f8fa] sm:px-4"
        >
          <PlusIcon className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t.market.sellCta}</span>
        </Link>
      </form>

      <div className="animate-rise-delay-1 mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={hrefFor({ q: queryText || undefined })}
          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
            !category
              ? "bg-brand text-white shadow-sm"
              : "bg-white/90 text-foreground ring-1 ring-black/6 hover:bg-white"
          }`}
        >
          {t.market.all}
        </Link>
        {(categories || []).map((cat) => (
          <Link
            key={cat.id}
            href={hrefFor({
              category: cat.slug,
              q: queryText || undefined,
            })}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
              category === cat.slug
                ? "bg-brand text-white shadow-sm"
                : "bg-white/90 text-foreground ring-1 ring-black/6 hover:bg-white"
            }`}
          >
            {categoryLabel(cat, locale)}
          </Link>
        ))}
      </div>

      <div className="animate-rise-delay-2 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {rows.length ? (
          rows.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        ) : (
          <p className="col-span-full rounded-2xl border border-dashed border-black/10 bg-white/50 px-4 py-10 text-center text-ink-muted">
            {queryText ? t.market.noResults : t.market.empty}
          </p>
        )}
      </div>
    </main>
  );
}
