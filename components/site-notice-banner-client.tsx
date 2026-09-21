"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { SITE_BANNER_ROTATE_MS } from "@/lib/site-banner";

const DISMISS_KEY = "cm_site_banner_dismissed_v3";
const FADE_MS = 400;

export type SiteBannerSlide = {
  id: number;
  body: string;
  updatedAt: string;
  dismissDays: number;
  bgColor: string;
  textColor: string;
};

type DismissRecord = {
  fingerprint: string;
  until: number;
};

function readDismiss(): DismissRecord | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (
      typeof parsed?.fingerprint !== "string" ||
      typeof parsed?.until !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function slidesFingerprint(slides: SiteBannerSlide[]) {
  return slides
    .map((slide) => `${slide.id}:${slide.updatedAt}`)
    .sort()
    .join("|");
}

export function SiteNoticeBannerClient({
  slides,
}: {
  slides: SiteBannerSlide[];
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [opaque, setOpaque] = useState(true);

  const fingerprint = useMemo(() => slidesFingerprint(slides), [slides]);
  const safeIndex = slides.length ? index % slides.length : 0;
  const current = slides[safeIndex] ?? null;

  useEffect(() => {
    const record = readDismiss();
    if (record && record.fingerprint === fingerprint && Date.now() < record.until) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setIndex(0);
    setOpaque(true);
  }, [fingerprint]);

  useEffect(() => {
    if (!visible || slides.length <= 1) return;

    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    const rotateTimer = setInterval(() => {
      setOpaque(false);
      fadeTimer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % slides.length);
        setOpaque(true);
      }, FADE_MS);
    }, SITE_BANNER_ROTATE_MS);

    return () => {
      clearInterval(rotateTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [visible, slides.length]);

  if (!visible || !current?.body) return null;

  const days = Math.max(1, Math.min(365, Math.floor(current.dismissDays || 7)));

  return (
    <aside
      className="border-b border-black/10 transition-[background-color,color] ease-in-out"
      style={{
        backgroundColor: current.bgColor,
        color: current.textColor,
        transitionDuration: `${FADE_MS}ms`,
      }}
    >
      <div
        className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 transition-opacity ease-in-out sm:gap-3 sm:px-6 sm:py-3"
        style={{
          opacity: opaque ? 1 : 0,
          transitionDuration: `${FADE_MS}ms`,
        }}
      >
        <p className="min-w-0 flex-1 text-sm leading-snug whitespace-pre-line">
          {current.body}
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              const until = Date.now() + days * 24 * 60 * 60 * 1000;
              localStorage.setItem(
                DISMISS_KEY,
                JSON.stringify({
                  fingerprint,
                  until,
                } satisfies DismissRecord),
              );
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100"
          aria-label={t.admin.bannerDismiss}
        >
          <XMarkIcon className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
