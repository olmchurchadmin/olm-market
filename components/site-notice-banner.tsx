import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { SiteBanner } from "@/lib/types";
import { siteBannerImageUrl } from "@/lib/utils";

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

  const [{ locale, t }, supabase] = await Promise.all([
    getI18n(),
    createClient(),
  ]);

  const { data, error } = await supabase
    .from("site_banner")
    .select(
      "id, enabled, body_ko, body_en, cta_label_ko, cta_label_en, cta_url, image_path, starts_at, ends_at, updated_at",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return null;
  const banner = data as SiteBanner;
  if (!isBannerLive(banner, Date.now())) return null;

  const body =
    (locale === "en"
      ? banner.body_en.trim() || banner.body_ko.trim()
      : banner.body_ko.trim() || banner.body_en.trim()) || "";
  const ctaLabel =
    locale === "en"
      ? banner.cta_label_en.trim() || banner.cta_label_ko.trim()
      : banner.cta_label_ko.trim() || banner.cta_label_en.trim();
  const ctaUrl = banner.cta_url.trim();
  const imageUrl = siteBannerImageUrl(banner.image_path);
  const hasCta = Boolean(ctaLabel && ctaUrl);

  return (
    <aside className="border-b border-brand/15 bg-[#eef2fb]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="size-12 shrink-0 rounded-md object-cover sm:size-14"
          />
        ) : null}
        <p className="min-w-0 flex-1 text-sm leading-snug text-foreground sm:text-[15px]">
          {body}
        </p>
        {hasCta ? (
          <Link
            href={ctaUrl}
            className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft sm:text-sm"
          >
            {ctaLabel}
          </Link>
        ) : null}
        <span className="sr-only">{t.admin.bannerTab}</span>
      </div>
    </aside>
  );
}
