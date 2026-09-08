"use client";

import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/components/locale-provider";
import { toggleWatchlistAction } from "@/lib/actions/watchlist";

export function WatchlistButton({
  listingId,
  initialWatched,
  isLoggedIn,
  loginHref,
  compact = false,
  variant = "button",
}: {
  listingId: string;
  initialWatched: boolean;
  isLoggedIn: boolean;
  loginHref: string;
  compact?: boolean;
  /** Icon-only overlay for listing cards. */
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [watched, setWatched] = useState(initialWatched);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setWatched(initialWatched);
  }, [initialWatched, listingId]);

  function runToggle(event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    setError(null);

    if (!isLoggedIn) {
      router.push(loginHref);
      return;
    }

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
  }

  if (variant === "icon") {
    const iconClass = "size-5 drop-shadow-sm sm:size-[1.35rem]";
    const label = watched
      ? t.account.removeFromWatchlist
      : t.account.addToWatchlist;

    if (!isLoggedIn) {
      return (
        <Link
          href={loginHref}
          onClick={(event) => event.stopPropagation()}
          aria-label={label}
          title={label}
          className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-white/90 text-ink-muted shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-red-500 sm:size-9"
        >
          <HeartOutline className={iconClass} aria-hidden />
        </Link>
      );
    }

    return (
      <button
        type="button"
        disabled={pending}
        aria-pressed={watched}
        aria-label={label}
        title={label}
        onClick={runToggle}
        className={`absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white disabled:opacity-60 sm:size-9 ${
          watched ? "text-red-500" : "text-ink-muted hover:text-red-500"
        }`}
      >
        {watched ? (
          <HeartSolid className={iconClass} aria-hidden />
        ) : (
          <HeartOutline className={iconClass} aria-hidden />
        )}
      </button>
    );
  }

  const className = compact
    ? "inline-flex items-center justify-center gap-1.5 rounded-md border border-brand/20 bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-brand/5 disabled:opacity-50"
    : "inline-flex w-full items-center justify-center gap-2 rounded-md border border-brand/20 bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  if (!isLoggedIn) {
    return (
      <Link href={loginHref} className={className}>
        <HeartOutline className={compact ? "size-4" : "size-5"} aria-hidden />
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
        onClick={() => runToggle()}
        className={className}
      >
        {watched ? (
          <HeartSolid
            className={`${compact ? "size-4" : "size-5"} text-red-500`}
            aria-hidden
          />
        ) : (
          <HeartOutline className={compact ? "size-4" : "size-5"} aria-hidden />
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
