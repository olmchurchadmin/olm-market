import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import type { SiteBanner } from "@/lib/types";
import { SiteNoticeBannerClient } from "@/components/site-notice-banner-client";

function isBannerLive(banner: SiteBanner, now: number) {
  if (!banner.enabled) return false;
  const body = banner.body_ko.trim() || banner.body_en.trim();
  if (!body) return false;
  if (banner.starts_at) {
    const start = new Date(banner.starts_at).getTime();
    if (!Number.isNaN(start) && now < start) return false;
  }
  if (banner.ends_at) {
    const end = new Date(banner.ends_at).getTime();
    if (!Number.isNaN(end) && now > end) return false;
  }
  return true;
}

export async function SiteNoticeBanner() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!configured) return null;

  const [{ locale }, supabase] = await Promise.all([getI18n(), createClient()]);

  const { data, error } = await supabase
    .from("site_banner")
    .select("id, enabled, body_ko, body_en, starts_at, ends_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return null;
  const banner = data as SiteBanner;
  if (!isBannerLive(banner, Date.now())) return null;

  const body =
    (locale === "en"
      ? banner.body_en.trim() || banner.body_ko.trim()
      : banner.body_ko.trim() || banner.body_en.trim()) || "";

  if (!body) return null;

  return (
    <SiteNoticeBannerClient body={body} updatedAt={banner.updated_at} />
  );
}
