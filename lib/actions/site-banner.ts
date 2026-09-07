"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

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

  if (profile?.role !== "admin") {
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

export async function saveSiteBannerAction(formData: FormData) {
  const { t } = await getI18n();
  const supabase = await requireAdminClient();

  const enabled = formData.get("enabled") === "on";
  const bodyKo = String(formData.get("body_ko") || "").trim();
  const bodyEn = String(formData.get("body_en") || "").trim();
  const startsAt = parseDateInput(String(formData.get("starts_on") || ""), "start");
  const endsAt = parseDateInput(String(formData.get("ends_on") || ""), "end");

  if (enabled && !bodyKo && !bodyEn) {
    redirect(
      `/admin?tab=banner&error=${encodeURIComponent(t.errors.bannerTextRequired)}`,
    );
  }

  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    redirect(
      `/admin?tab=banner&error=${encodeURIComponent(t.errors.bannerScheduleInvalid)}`,
    );
  }

  const { data: current } = await supabase
    .from("site_banner")
    .select("image_path")
    .eq("id", 1)
    .maybeSingle();

  if (current?.image_path) {
    await supabase.storage.from("site-banner").remove([current.image_path]);
  }

  const payload = {
    id: 1,
    enabled,
    body_ko: bodyKo,
    body_en: bodyEn,
    cta_label_ko: "",
    cta_label_en: "",
    cta_url: "",
    image_path: null,
    starts_at: startsAt,
    ends_at: endsAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("site_banner").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    redirect(
      `/admin?tab=banner&error=${encodeURIComponent(error.message || t.errors.bannerSaveFailed)}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?tab=banner&bannerSaved=1");
}
