"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { saveSiteBannerAction } from "@/lib/actions/site-banner";
import type { SiteBanner } from "@/lib/types";

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplayDate(yyyyMmDd: string, locale: string) {
  if (!yyyyMmDd) return "";
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function AdminBannerPanel({ banner }: { banner: SiteBanner | null }) {
  const { t, locale } = useI18n();
  const [startsOn, setStartsOn] = useState(toDateInputValue(banner?.starts_at));
  const [endsOn, setEndsOn] = useState(toDateInputValue(banner?.ends_at));

  const status = useMemo(() => {
    if (!banner?.enabled) return t.admin.bannerStatusOff;
    const now = Date.now();
    const start = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
    const end = banner.ends_at ? new Date(banner.ends_at).getTime() : null;
    if (start != null && now < start) return t.admin.bannerStatusScheduled;
    if (end != null && now > end) return t.admin.bannerStatusExpired;
    return t.admin.bannerStatusLive;
  }, [banner, t.admin]);

  const scheduleSummary = useMemo(() => {
    if (!startsOn && !endsOn) return t.admin.bannerScheduleAlways;
    if (startsOn && !endsOn) {
      return t.admin.bannerScheduleFrom.replace(
        "{start}",
        formatDisplayDate(startsOn, locale),
      );
    }
    if (!startsOn && endsOn) {
      return t.admin.bannerScheduleUntil.replace(
        "{end}",
        formatDisplayDate(endsOn, locale),
      );
    }
    return t.admin.bannerScheduleRange
      .replace("{start}", formatDisplayDate(startsOn, locale))
      .replace("{end}", formatDisplayDate(endsOn, locale));
  }, [startsOn, endsOn, locale, t.admin]);

  function applyPreset(kind: "always" | "today" | "week" | "month") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (kind === "always") {
      setStartsOn("");
      setEndsOn("");
      return;
    }
    if (kind === "today") {
      const ymd = toYmd(today);
      setStartsOn(ymd);
      setEndsOn(ymd);
      return;
    }
    if (kind === "week") {
      setStartsOn(toYmd(today));
      setEndsOn(toYmd(addDays(today, 6)));
      return;
    }
    setStartsOn(toYmd(today));
    setEndsOn(toYmd(addDays(today, 29)));
  }

  return (
    <section className="mt-8">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
        {t.admin.bannerTab}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{t.admin.bannerBlurb}</p>
      <p className="mt-2 text-xs font-medium text-brand">{status}</p>

      <form
        action={saveSiteBannerAction}
        className="mt-5 space-y-5 rounded-lg border border-brand/10 bg-white/70 p-4 sm:p-5"
      >
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={Boolean(banner?.enabled)}
            className="size-4 accent-[var(--brand)]"
          />
          {t.admin.bannerEnabled}
        </label>

        <label className="block space-y-1.5 text-sm font-medium">
          {t.admin.bannerBodyKo}
          <textarea
            name="body_ko"
            rows={3}
            defaultValue={banner?.body_ko || ""}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
          />
          <span className="block text-xs font-normal text-ink-muted">
            {t.admin.bannerBodyHint}
          </span>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            {t.admin.bannerScheduleLabel}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["always", t.admin.bannerPresetAlways],
                ["today", t.admin.bannerPresetToday],
                ["week", t.admin.bannerPresetWeek],
                ["month", t.admin.bannerPresetMonth],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => applyPreset(kind)}
                className="rounded-md border border-brand/15 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-brand/5"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">
              {t.admin.bannerStartsAt}
              <input
                name="starts_on"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              {t.admin.bannerEndsAt}
              <input
                name="ends_on"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
              />
            </label>
          </div>
          <p className="rounded-md bg-brand/5 px-3 py-2 text-xs text-foreground">
            {scheduleSummary}
          </p>
          <p className="text-xs text-ink-muted">{t.admin.bannerScheduleHint}</p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span>{t.admin.bannerDismissDays}</span>
            <input
              name="dismiss_days"
              type="number"
              min={1}
              max={365}
              defaultValue={
                typeof banner?.dismiss_days === "number"
                  ? banner.dismiss_days
                  : 7
              }
              className="w-full max-w-[12rem] rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
            <span className="text-xs font-normal text-ink-muted">
              {t.admin.bannerDismissDaysHint}
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span>{t.admin.bannerBgColor}</span>
              <div className="flex items-center gap-2">
                <input
                  name="bg_color"
                  type="color"
                  defaultValue={banner?.bg_color?.trim() || "#ffc83d"}
                  className="h-10 w-14 cursor-pointer rounded-md border border-brand/15 bg-white p-1"
                />
                <span className="text-xs font-normal text-ink-muted">
                  {t.admin.bannerColorHint}
                </span>
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span>{t.admin.bannerTextColor}</span>
              <div className="flex items-center gap-2">
                <input
                  name="text_color"
                  type="color"
                  defaultValue={banner?.text_color?.trim() || "#000000"}
                  className="h-10 w-14 cursor-pointer rounded-md border border-brand/15 bg-white p-1"
                />
                <span className="text-xs font-normal text-ink-muted">
                  {t.admin.bannerColorHint}
                </span>
              </div>
            </label>
          </div>
        </div>

        <PendingSubmitButton
          pendingLabel={t.common.loading}
          className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft disabled:cursor-wait disabled:opacity-70"
        >
          {t.admin.bannerSave}
        </PendingSubmitButton>
      </form>
    </section>
  );
}
