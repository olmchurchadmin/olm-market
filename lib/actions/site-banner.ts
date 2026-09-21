"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { isStaffRole } from "@/lib/auth";
import { translateKoreanSentenceToEnglish } from "@/lib/i18n/translate-ko-en";
import {
  SITE_BANNER_DEFAULT_BG,
  SITE_BANNER_DEFAULT_TEXT,
} from "@/lib/site-banner";
import { createClient } from "@/lib/supabase/server";

export type SaveSiteBannerResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin?tab=banner");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isStaffRole(profile?.role)) {
    redirect("/");
  }

  return supabase;
}

/** Parse YYYY-MM-DD as local start (00:00) or end (23:59:59.999). */
function parseDateInput(raw: string, edge: "start" | "end") {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const date =
    edge === "start"
      ? new Date(y, m - 1, d, 0, 0, 0, 0)
      : new Date(y, m - 1, d, 23, 59, 59, 999);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function hexColor(raw: string, fallback: string) {
  const value = raw.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(value) ? value : fallback;
}

function scheduleBannerSideEffects(options: {
  bannerId: number;
  bodyKo: string;
  needsEnglish: boolean;
}) {
  after(async () => {
    if (options.needsEnglish && options.bodyKo) {
      try {
        const bodyEn = await translateKoreanSentenceToEnglish(options.bodyKo);
        const supabase = await createClient();
        await supabase
          .from("site_banner")
          .update({ body_en: bodyEn })
          .eq("id", options.bannerId);
      } catch (error) {
        console.error("[site-banner translate]", error);
      }
    }
    revalidatePath("/");
    revalidatePath("/admin");
  });
}

export async function saveSiteBannerAction(
  formData: FormData,
): Promise<SaveSiteBannerResult> {
  const { t } = await getI18n();
  const supabase = await requireAdminClient();

  const bannerIdRaw = String(formData.get("banner_id") || "").trim();
  const bannerId = bannerIdRaw ? Number.parseInt(bannerIdRaw, 10) : null;
  const enabled = formData.get("enabled") === "on";
  const bodyKo = String(formData.get("body_ko") || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  const startsAt = parseDateInput(
    String(formData.get("starts_on") || ""),
    "start",
  );
  const endsAt = parseDateInput(String(formData.get("ends_on") || ""), "end");

  if (enabled && !bodyKo) {
    return { ok: false, error: t.errors.bannerTextRequired };
  }

  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    return { ok: false, error: t.errors.bannerScheduleInvalid };
  }

  const dismissDaysRaw = Number.parseInt(
    String(formData.get("dismiss_days") || "7"),
    10,
  );
  const dismissDays = Number.isFinite(dismissDaysRaw)
    ? Math.max(1, Math.min(365, dismissDaysRaw))
    : 7;

  const bgColor = hexColor(
    String(formData.get("bg_color") || ""),
    SITE_BANNER_DEFAULT_BG,
  );
  const textColor = hexColor(
    String(formData.get("text_color") || ""),
    SITE_BANNER_DEFAULT_TEXT,
  );

  let savedId: number | null = null;
  let needsEnglish = Boolean(bodyKo);
  let bodyEn = "";

  if (bannerId != null && Number.isFinite(bannerId)) {
    const { data: current } = await supabase
      .from("site_banner")
      .select("id, image_path, body_ko, body_en")
      .eq("id", bannerId)
      .maybeSingle();

    if (!current) {
      return { ok: false, error: t.errors.bannerSaveFailed };
    }

    if (current.image_path) {
      await supabase.storage.from("site-banner").remove([current.image_path]);
    }

    if (current.body_ko === bodyKo && current.body_en?.trim()) {
      bodyEn = current.body_en;
      needsEnglish = false;
    }

    const { error } = await supabase
      .from("site_banner")
      .update({
        enabled,
        body_ko: bodyKo,
        body_en: bodyEn,
        cta_label_ko: "",
        cta_label_en: "",
        cta_url: "",
        image_path: null,
        starts_at: startsAt,
        ends_at: endsAt,
        dismiss_days: dismissDays,
        bg_color: bgColor,
        text_color: textColor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bannerId);

    if (error) {
      return { ok: false, error: error.message || t.errors.bannerSaveFailed };
    }
    savedId = bannerId;
  } else {
    const { data, error } = await supabase
      .from("site_banner")
      .insert({
        enabled,
        body_ko: bodyKo,
        body_en: "",
        cta_label_ko: "",
        cta_label_en: "",
        cta_url: "",
        image_path: null,
        starts_at: startsAt,
        ends_at: endsAt,
        dismiss_days: dismissDays,
        bg_color: bgColor,
        text_color: textColor,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || t.errors.bannerSaveFailed,
      };
    }
    savedId = data.id as number;
  }

  scheduleBannerSideEffects({
    bannerId: savedId,
    bodyKo,
    needsEnglish,
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteSiteBannerAction(formData: FormData) {
  const { t } = await getI18n();
  const supabase = await requireAdminClient();

  const bannerId = Number.parseInt(
    String(formData.get("banner_id") || ""),
    10,
  );
  if (!Number.isFinite(bannerId)) {
    redirect("/admin?tab=banner");
  }

  const { data: current } = await supabase
    .from("site_banner")
    .select("id, image_path")
    .eq("id", bannerId)
    .maybeSingle();

  if (!current) {
    redirect("/admin?tab=banner");
  }

  if (current.image_path) {
    await supabase.storage.from("site-banner").remove([current.image_path]);
  }

  const { error } = await supabase
    .from("site_banner")
    .delete()
    .eq("id", bannerId);

  if (error) {
    redirect(
      `/admin?tab=banner&error=${encodeURIComponent(error.message || t.errors.bannerDeleteFailed)}`,
    );
  }

  after(() => {
    revalidatePath("/");
    revalidatePath("/admin");
  });
  redirect("/admin?tab=banner&bannerDeleted=1");
}
