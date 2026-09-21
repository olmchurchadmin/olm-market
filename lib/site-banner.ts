import type { SiteBanner } from "@/lib/types";

export const SITE_BANNER_DEFAULT_BG = "#b62b6e";
export const SITE_BANNER_DEFAULT_TEXT = "#ffffff";
export const SITE_BANNER_ROTATE_MS = 10_000;

export type BannerStatusKey = "off" | "live" | "scheduled" | "expired";

export function getBannerStatus(
  banner: Pick<SiteBanner, "enabled" | "starts_at" | "ends_at">,
  now = Date.now(),
): BannerStatusKey {
  if (!banner.enabled) return "off";
  const start = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const end = banner.ends_at ? new Date(banner.ends_at).getTime() : null;
  if (start != null && !Number.isNaN(start) && now < start) return "scheduled";
  if (end != null && !Number.isNaN(end) && now > end) return "expired";
  return "live";
}

export function isBannerLive(
  banner: Pick<
    SiteBanner,
    "enabled" | "body_ko" | "body_en" | "starts_at" | "ends_at"
  >,
  now = Date.now(),
) {
  if (getBannerStatus(banner, now) !== "live") return false;
  const body = banner.body_ko.trim() || banner.body_en.trim();
  return Boolean(body);
}

function sortLiveBanners(a: SiteBanner, b: SiteBanner) {
  const aEnd = a.ends_at ? new Date(a.ends_at).getTime() : Number.POSITIVE_INFINITY;
  const bEnd = b.ends_at ? new Date(b.ends_at).getTime() : Number.POSITIVE_INFINITY;
  if (bEnd !== aEnd) return bEnd - aEnd;
  const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0;
  if (bStart !== aStart) return bStart - aStart;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

/** All currently live banners, newest schedule end first. */
export function listLiveBanners(banners: SiteBanner[], now = Date.now()) {
  return banners.filter((banner) => isBannerLive(banner, now)).sort(sortLiveBanners);
}

/** Prefer the newest scheduled end among currently live banners. */
export function pickLiveBanner(banners: SiteBanner[], now = Date.now()) {
  return listLiveBanners(banners, now)[0] ?? null;
}
