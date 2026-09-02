"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListingCard } from "@/components/listing-card";
import { useI18n } from "@/components/locale-provider";
import type { Listing } from "@/lib/types";

const RING_SIZE = 40;
const RING_STROKE = 1;
const HEADER_OFFSET = 80;

function ListProgressRing({
  progress,
  seen,
  total,
  onClick,
  labels,
}: {
  progress: number;
  seen: number;
  total: number;
  onClick: () => void;
  labels: { aria: string; title: string };
}) {
  const size = RING_SIZE;
  const stroke = RING_STROKE;
  // Inset so the thin stroke is never clipped by the SVG box.
  const radius = (size - stroke) / 2 - 1.5;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);
  const label = Math.min(total, Math.max(0, seen));

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex cursor-pointer items-center justify-center overflow-visible rounded-full bg-transparent transition hover:opacity-80"
      style={{ width: size, height: size }}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={label}
      aria-label={labels.aria
        .replace("{seen}", String(label))
        .replace("{total}", String(total))}
      title={labels.title
        .replace("{seen}", String(label))
        .replace("{total}", String(total))}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 overflow-visible"
        aria-hidden
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="var(--background)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          vectorEffect="non-scaling-stroke"
          className="text-black/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          vectorEffect="non-scaling-stroke"
          className="text-brand"
        />
      </svg>
      <span className="pointer-events-none absolute text-[8px] font-medium tabular-nums tracking-tight text-ink-muted">
        {label}
      </span>
    </button>
  );
}

export function MarketInfiniteList({
  category,
  q,
  status,
  initialItems,
  total,
}: {
  category?: string;
  q?: string;
  status?: "active" | "sold";
  initialItems: Listing[];
  total: number;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialItems.length < total);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seen, setSeen] = useState(1);
  const [ringVisible, setRingVisible] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(initialItems.length < total);
  }, [initialItems, total]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      if (category) sp.set("category", category);
      if (q) sp.set("q", q);
      if (status === "sold") sp.set("status", "sold");
      const res = await fetch(`/api/market/listings?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`listings ${res.status}`);
      const data = (await res.json()) as {
        items?: Listing[];
        hasMore?: boolean;
      };
      const nextItems = data.items ?? [];
      setItems((prev) => {
        const seenIds = new Set(prev.map((item) => item.id));
        return [...prev, ...nextItems.filter((item) => !seenIds.has(item.id))];
      });
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore) && nextItems.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [category, hasMore, page, q, status]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const updateProgress = () => {
      const list = listRef.current;
      if (!list || total <= 0) {
        setProgress(0);
        setSeen(0);
        setRingVisible(false);
        return;
      }

      const rect = list.getBoundingClientRect();
      const viewport = window.innerHeight;
      const scrolledIntoList = rect.top < HEADER_OFFSET + 24;
      const stillInList = rect.bottom > HEADER_OFFSET + 80;
      setRingVisible(scrolledIntoList && stillInList);
      if (!scrolledIntoList || !stillInList) return;

      const readingLine = Math.min(viewport * 0.35, HEADER_OFFSET + 64);
      const nodes = list.querySelectorAll<HTMLElement>("[data-listing-index]");
      let currentIndex = 0;
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i]!;
        if (node.getBoundingClientRect().top <= readingLine) {
          currentIndex = Number(node.dataset.listingIndex ?? i);
        } else {
          break;
        }
      }

      const active = nodes[currentIndex];
      let fraction = 0;
      if (active) {
        const r = active.getBoundingClientRect();
        const h = Math.max(r.height, 1);
        fraction = Math.min(1, Math.max(0, (readingLine - r.top) / h));
      }

      const continuous = Math.min(
        1,
        Math.max(0, (currentIndex + fraction) / Math.max(total, 1)),
      );
      const displaySeen = Math.min(
        total,
        Math.max(0, Math.round(continuous * total)),
      );

      setSeen(Math.max(displaySeen, continuous > 0 ? 1 : 0));
      setProgress(continuous);
    };

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [items.length, total]);

  const scrollToPageTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-black/10 bg-white/50 px-4 py-10 text-center text-ink-muted">
        {q ? t.market.noResults : t.market.empty}
      </p>
    );
  }

  return (
    <div className="relative overflow-visible">
      <div className="pointer-events-none absolute inset-y-0 right-1 z-20 sm:right-0">
        <div
          className={`sticky top-20 flex justify-end pt-2 transition-opacity duration-150 ease-out sm:top-24 ${
            ringVisible ? "pointer-events-auto opacity-100" : "opacity-0"
          }`}
        >
          <ListProgressRing
            progress={progress}
            seen={seen}
            total={total}
            onClick={scrollToPageTop}
            labels={{
              aria: t.market.scrollProgressAria,
              title: t.market.scrollProgressTitle,
            }}
          />
        </div>
      </div>

      <div
        ref={listRef}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
      >
        {items.map((listing, index) => (
          <div key={listing.id} data-listing-index={index}>
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-8 w-full" aria-hidden />

      {loading ? (
        <p className="py-6 text-center text-xs tracking-wide text-ink-muted">
          {t.market.loadingMore}
        </p>
      ) : null}
      {!hasMore && items.length > 0 ? (
        <p className="py-6 text-center text-xs tracking-wide text-ink-muted">
          {t.market.itemsCount.replace("{total}", String(total))}
        </p>
      ) : null}
    </div>
  );
}
