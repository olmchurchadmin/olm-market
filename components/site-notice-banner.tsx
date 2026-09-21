import { SiteNoticeBannerClient } from "@/components/site-notice-banner-client";
import { getI18n } from "@/lib/i18n/server";
import {
  listLiveBanners,
  SITE_BANNER_DEFAULT_BG,
  SITE_BANNER_DEFAULT_TEXT,
} from "@/lib/site-banner";
import { createClient } from "@/lib/supabase/server";
import type { SiteBanner } from "@/lib/types";

function normalizeNewlines(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function resolveBannerBody(locale: string, banner: SiteBanner) {
  const ko = normalizeNewlines(banner.body_ko || "");
  const en = normalizeNewlines(banner.body_en || "");
  if (locale !== "en") return ko || en;
  // Prefer stored English; fall back to Korean until background translation finishes.
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
    .order("ends_at", { ascending: false, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (error || !data?.length) return null;

  const live = listLiveBanners(data as SiteBanner[]);
  if (!live.length) return null;

  const slides = live
    .map((banner) => {
      const body = resolveBannerBody(locale, banner);
      if (!body) return null;
      return {
        id: banner.id,
        body,
        updatedAt: banner.updated_at,
        dismissDays:
          typeof banner.dismiss_days === "number" ? banner.dismiss_days : 7,
        bgColor: banner.bg_color?.trim() || SITE_BANNER_DEFAULT_BG,
        textColor: banner.text_color?.trim() || SITE_BANNER_DEFAULT_TEXT,
      };
    })
    .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide));

  if (!slides.length) return null;

  return <SiteNoticeBannerClient slides={slides} />;
}
