"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/components/locale-provider";

export function AdminSearchableSection({
  title,
  icon,
  placeholder,
  children,
}: {
  title: string;
  icon: ReactNode;
  placeholder?: string;
  children: (query: string) => ReactNode;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          {icon}
          {title}
        </h2>
        <label className="relative block w-full max-w-xs sm:w-64">
          <span className="sr-only">{t.market.search}</span>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || t.admin.listSearchPlaceholder}
            className="w-full rounded-md border border-brand/15 bg-white py-2 pl-9 pr-3 text-sm text-foreground outline-none ring-brand/20 placeholder:text-ink-muted focus:ring-2"
          />
        </label>
      </div>
      <div className="mt-4">{children(query.trim())}</div>
    </section>
  );
}

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function matchesSearch(query: string, ...parts: Array<string | null | undefined>) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return parts.some((part) => (part || "").toLowerCase().includes(q));
}
