"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { saveSiteBannerAction } from "@/lib/actions/site-banner";
import type { SiteBanner } from "@/lib/types";
import { siteBannerImageUrl } from "@/lib/utils";

function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminBannerPanel({ banner }: { banner: SiteBanner | null }) {
  const { t } = useI18n();
  const existingUrl = siteBannerImageUrl(banner?.image_path);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);

  const shownImage = useMemo(() => {
    if (clearImage) return null;
    return previewUrl || existingUrl;
  }, [clearImage, previewUrl, existingUrl]);

  const status = useMemo(() => {
    if (!banner?.enabled) return t.admin.bannerStatusOff;
    const now = Date.now();
    const start = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
    const end = banner.ends_at ? new Date(banner.ends_at).getTime() : null;
    if (start != null && now < start) return t.admin.bannerStatusScheduled;
    if (end != null && now > end) return t.admin.bannerStatusExpired;
    return t.admin.bannerStatusLive;
  }, [banner, t.admin]);

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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            {t.admin.bannerBodyKo}
            <textarea
              name="body_ko"
              rows={3}
              defaultValue={banner?.body_ko || ""}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            {t.admin.bannerBodyEn}
            <textarea
              name="body_en"
              rows={3}
              defaultValue={banner?.body_en || ""}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            {t.admin.bannerCtaLabelKo}
            <input
              name="cta_label_ko"
              defaultValue={banner?.cta_label_ko || ""}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            {t.admin.bannerCtaLabelEn}
            <input
              name="cta_label_en"
              defaultValue={banner?.cta_label_en || ""}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm font-medium">
          {t.admin.bannerCtaUrl}
          <input
            name="cta_url"
            type="url"
            placeholder="https://"
            defaultValue={banner?.cta_url || ""}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            {t.admin.bannerStartsAt}
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(banner?.starts_at)}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            {t.admin.bannerEndsAt}
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(banner?.ends_at)}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
            />
          </label>
        </div>
        <p className="text-xs text-ink-muted">{t.admin.bannerScheduleHint}</p>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t.admin.bannerImage}
          </p>
          {shownImage ? (
            <div className="relative h-28 w-full max-w-md overflow-hidden rounded-md border border-brand/10 bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shownImage}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <p className="text-xs text-ink-muted">{t.admin.bannerImageEmpty}</p>
          )}
          <input
            type="file"
            name="image"
            accept="image/*"
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              if (file) {
                setClearImage(false);
                setPreviewUrl(URL.createObjectURL(file));
              } else {
                setPreviewUrl(null);
              }
            }}
          />
          {existingUrl && !clearImage ? (
            <label className="inline-flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                name="clear_image"
                checked={clearImage}
                onChange={(e) => {
                  setClearImage(e.target.checked);
                  if (e.target.checked && previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                className="accent-[var(--brand)]"
              />
              {t.admin.bannerClearImage}
            </label>
          ) : clearImage ? (
            <input type="hidden" name="clear_image" value="on" />
          ) : null}
        </div>

        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
        >
          {t.admin.bannerSave}
        </button>
      </form>
    </section>
  );
}
