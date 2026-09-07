import { unstable_cache } from "next/cache";
import { SiteNoticeBannerClient } from "@/components/site-notice-banner-client";
import { getI18n } from "@/lib/i18n/server";
import { translateKoreanSentenceToEnglish } from "@/lib/i18n/translate-ko-en";
import { createClient } from "@/lib/supabase/server";
import type { SiteBanner } from "@/lib/types";

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

function normalizeNewlines(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

const englishFromKoreanCached = unstable_cache(
  async (korean: string, _updatedAt: string) =>
    translateKoreanSentenceToEnglish(korean),
  ["site-banner-en-from-ko"],
  { revalidate: 60 * 60 * 24 },
);

async function resolveBannerBody(locale: string, banner: SiteBanner) {
  const ko = normalizeNewlines(banner.body_ko || "");
  const en = normalizeNewlines(banner.body_en || "");

  if (locale !== "en") return ko || en;

  // Korean is the structure source: keep the same line breaks for English.
  if (ko.includes("\n")) {
    const enLines = en.split("\n");
    const koLines = ko.split("\n");
    if (en && enLines.length === koLines.length) return en;
    return englishFromKoreanCached(ko, banner.updated_at);
  }

  return en || ko;
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

  const body = await resolveBannerBody(locale, banner);
  if (!body) return null;

  return (
    <SiteNoticeBannerClient body={body} updatedAt={banner.updated_at} />
  );
}
