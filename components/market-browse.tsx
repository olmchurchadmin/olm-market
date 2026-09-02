import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { MarketInfiniteList } from "@/components/market-infinite-list";
import { categoryLabel } from "@/lib/i18n/categories";
import { getI18n } from "@/lib/i18n/server";
import {
  fetchMarketListingsPage,
  sanitizeMarketSearch,
} from "@/lib/market/listings-query";
import { createClient } from "@/lib/supabase/server";

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
  const queryText = sanitizeMarketSearch(q || "");
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
  const [{ data: categories }, firstPage] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    fetchMarketListingsPage({
      category,
      q: queryText || undefined,
      page: 1,
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <form
        action="/"
        method="get"
        className="animate-rise flex gap-2 rounded-md border border-brand/10 bg-surface/90 p-2 shadow-[0_10px_30px_rgba(36,59,143,0.06)] backdrop-blur-sm"
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
            className="w-full rounded-md border-0 bg-transparent py-2.5 pr-3 pl-10 text-sm outline-none placeholder:text-ink-muted/80 focus:ring-0"
          />
        </label>
        <button
          type="submit"
          className="shrink-0 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-soft"
        >
          {t.market.search}
        </button>
        <Link
          href="/sell"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-brand/15 bg-surface px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-sun sm:px-4"
        >
          <PlusIcon className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t.market.sellCta}</span>
        </Link>
      </form>

      <div className="animate-rise-delay-1 mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={hrefFor({ q: queryText || undefined })}
          className={`shrink-0 rounded-md px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
            !category
              ? "bg-brand text-white shadow-sm"
              : "bg-surface/90 text-foreground ring-1 ring-brand/10 hover:bg-sun"
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
            className={`shrink-0 rounded-md px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
              category === cat.slug
                ? "bg-brand text-white shadow-sm"
                : "bg-surface/90 text-foreground ring-1 ring-brand/10 hover:bg-sun"
            }`}
          >
            {categoryLabel(cat, locale)}
          </Link>
        ))}
      </div>

      <div className="animate-rise-delay-2 mt-6">
        <MarketInfiniteList
          key={`${category || "all"}:${queryText}`}
          category={category}
          q={queryText || undefined}
          initialItems={firstPage.items}
          total={firstPage.total}
        />
      </div>
    </main>
  );
}
