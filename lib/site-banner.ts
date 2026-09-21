import type { SiteBanner } from "@/lib/types";

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
  banner: Pick<SiteBanner, "enabled" | "body_ko" | "body_en" | "starts_at" | "ends_at">,
  now = Date.now(),
) {
  if (getBannerStatus(banner, now) !== "live") return false;
  const body = banner.body_ko.trim() || banner.body_en.trim();
  return Boolean(body);
}

/** Prefer the newest scheduled start among currently live banners. */
export function pickLiveBanner(banners: SiteBanner[], now = Date.now()) {
  const live = banners.filter((banner) => isBannerLive(banner, now));
  if (!live.length) return null;
  live.sort((a, b) => {
    const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0;
    const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0;
    if (bStart !== aStart) return bStart - aStart;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  return live[0] ?? null;
}
