"use client";

import { BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolid } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/locale-provider";
import { toggleWatchlistAction } from "@/lib/actions/watchlist";

export function WatchlistButton({
  listingId,
  initialWatched,
  isLoggedIn,
  loginHref,
  compact = false,
}: {
  listingId: string;
  initialWatched: boolean;
  isLoggedIn: boolean;
  loginHref: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [watched, setWatched] = useState(initialWatched);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const className = compact
    ? "inline-flex items-center justify-center gap-1.5 rounded-md border border-brand/20 bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-brand/5 disabled:opacity-50"
    : "inline-flex w-full items-center justify-center gap-2 rounded-md border border-brand/20 bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  if (!isLoggedIn) {
    return (
      <Link href={loginHref} className={className}>
        <BookmarkOutline className={compact ? "size-4" : "size-5"} aria-hidden />
        {t.account.addToWatchlist}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        aria-pressed={watched}
        onClick={() => {
          setError(null);
          const previous = watched;
          setWatched(!previous);
          startTransition(async () => {
            const result = await toggleWatchlistAction(listingId);
            if (!result.ok) {
              setWatched(previous);
              if (result.error === t.errors.loginRequired) {
                router.push(loginHref);
                return;
              }
              setError(result.error);
              return;
            }
            setWatched(result.watched);
            router.refresh();
          });
        }}
        className={className}
      >
        {watched ? (
          <BookmarkSolid
            className={`${compact ? "size-4" : "size-5"} text-brand`}
            aria-hidden
          />
        ) : (
          <BookmarkOutline className={compact ? "size-4" : "size-5"} aria-hidden />
        )}
        {pending
          ? t.common.loading
          : watched
            ? t.account.removeFromWatchlist
            : t.account.addToWatchlist}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
