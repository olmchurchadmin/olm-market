"use client";

import {
  ChatBubbleLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import type { BoardListPost } from "@/lib/board/posts-query";
import {
  accountDisplayName,
  boardImageUrl,
  formatAppDateTime,
} from "@/lib/utils";

const RING_SIZE = 40;
const RING_STROKE = 2;
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
  const radius = (size - stroke) / 2 - 1.5;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);
  const label = Math.min(total, Math.max(0, seen));

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-center overflow-visible rounded-full bg-transparent transition hover:opacity-80"
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

export function BoardInfiniteList({
  initialItems,
  total,
}: {
  initialItems: BoardListPost[];
  total: number;
}) {
  const { locale, t } = useI18n();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialItems.length < total);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seen, setSeen] = useState(1);
  const [ringVisible, setRingVisible] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
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
      const res = await fetch(`/api/board/posts?page=${nextPage}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`board posts ${res.status}`);
      const data = (await res.json()) as {
        items?: BoardListPost[];
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
  }, [hasMore, page]);

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

      if (!scrolledIntoList) return;

      if (!stillInList) {
        setProgress(1);
        setSeen(total);
        return;
      }

      const readingLine = Math.min(viewport * 0.35, HEADER_OFFSET + 64);
      const listHeight = Math.max(rect.height, 1);
      let continuous = Math.min(
        1,
        Math.max(0, (readingLine - rect.top) / listHeight),
      );

      const docBottomGap =
        document.documentElement.scrollHeight - (window.scrollY + viewport);
      const nearPageBottom = docBottomGap <= 64;
      const listEndReached = rect.bottom <= readingLine + 24;

      if (nearPageBottom || listEndReached) {
        continuous = 1;
      }

      const displaySeen = Math.min(
        total,
        Math.max(0, Math.round(continuous * total)),
      );

      setSeen(
        continuous >= 1 ? total : Math.max(displaySeen, continuous > 0 ? 1 : 0),
      );
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
    return <p className="mt-10 text-sm text-ink-muted">{t.board.empty}</p>;
  }

  return (
    <div className="relative mt-8 overflow-x-clip">
      <div className="pointer-events-none absolute inset-y-0 -right-1 z-20 sm:-right-2">
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

      <ul
        ref={listRef}
        className="divide-y divide-black/6 rounded-md border border-black/6 bg-white"
      >
        {items.map((post) => {
          const thumb = boardImageUrl(post.thumb_path);
          return (
            <li key={post.id}>
              <Link
                href={`/board/${post.id}`}
                className="flex items-center gap-3 px-4 py-4 transition hover:bg-brand/5"
              >
                {thumb ? (
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-md border border-brand/10 bg-white sm:size-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {post.body}
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {accountDisplayName(
                      post.author ?? {
                        nickname: null,
                        full_name: null,
                        email: null,
                      },
                    )}{" "}
                    ·{" "}
                    {formatAppDateTime(post.created_at, locale)}
                  </p>
                </span>
                {post.reply_count > 0 ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-ink-muted"
                    aria-label={`${t.board.replies} ${post.reply_count}`}
                  >
                    <ChatBubbleLeftIcon className="size-3.5" aria-hidden />
                    {post.reply_count}
                  </span>
                ) : null}
                <ChevronRightIcon
                  className="size-5 shrink-0 text-ink-muted"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

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
