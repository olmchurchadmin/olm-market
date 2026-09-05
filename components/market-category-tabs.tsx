"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

function tabClass(active: boolean, pending = false) {
  return `rounded-md px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
    active
      ? "bg-brand text-white shadow-sm"
      : "bg-white text-foreground ring-1 ring-brand/10 hover:bg-neutral-100"
  } ${pending ? "opacity-80" : ""}`;
}

export function MarketCategoryTabs({
  activeSlug,
  queryText,
  allLabel,
  categories,
}: {
  activeSlug?: string;
  queryText?: string;
  allLabel: string;
  categories: { id: string; slug: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingSlug, setPendingSlug] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setPendingSlug(undefined);
  }, [activeSlug, queryText]);

  const displaySlug =
    pendingSlug === undefined ? activeSlug : pendingSlug || undefined;

  function hrefFor(slug?: string) {
    const sp = new URLSearchParams();
    if (slug) sp.set("category", slug);
    if (queryText) sp.set("q", queryText);
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  }

  function go(slug?: string) {
    const next = slug || "";
    const current = activeSlug || "";
    if (next === current && pendingSlug === undefined) return;
    setPendingSlug(slug ?? null);
    startTransition(() => {
      router.push(hrefFor(slug));
    });
  }

  return (
    <div className="animate-rise-delay-1 mt-5 flex flex-wrap gap-2 py-1">
      <Link
        href={hrefFor()}
        prefetch
        aria-current={!displaySlug ? "page" : undefined}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          event.preventDefault();
          go();
        }}
        className={tabClass(!displaySlug, pending && pendingSlug === null)}
      >
        {allLabel}
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={hrefFor(cat.slug)}
          prefetch
          aria-current={displaySlug === cat.slug ? "page" : undefined}
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            ) {
              return;
            }
            event.preventDefault();
            go(cat.slug);
          }}
          className={tabClass(
            displaySlug === cat.slug,
            pending && pendingSlug === cat.slug,
          )}
        >
          {cat.label}
        </Link>
      ))}
    </div>
  );
}
