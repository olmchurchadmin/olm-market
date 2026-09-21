import { unstable_cache } from "next/cache";
import { SiteNoticeBannerClient } from "@/components/site-notice-banner-client";
import { getI18n } from "@/lib/i18n/server";
import { translateKoreanSentenceToEnglish } from "@/lib/i18n/translate-ko-en";
import { pickLiveBanner } from "@/lib/site-banner";
import { createClient } from "@/lib/supabase/server";
import type { SiteBanner } from "@/lib/types";

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
    .select(
      "id, enabled, body_ko, body_en, starts_at, ends_at, updated_at, dismiss_days, bg_color, text_color",
    )
    .eq("enabled", true)
    .order("starts_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error || !data?.length) return null;

  const banner = pickLiveBanner(data as SiteBanner[]);
  if (!banner) return null;

  const body = await resolveBannerBody(locale, banner);
  if (!body) return null;

  return (
    <SiteNoticeBannerClient
      body={body}
      updatedAt={banner.updated_at}
      dismissDays={
        typeof banner.dismiss_days === "number" ? banner.dismiss_days : 7
      }
      bgColor={banner.bg_color?.trim() || "#ffc83d"}
      textColor={banner.text_color?.trim() || "#000000"}
    />
  );
}
