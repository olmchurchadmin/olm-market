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

  return { supabase, userId: user.id };
}

function parseDatetimeLocal(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // datetime-local has no timezone; treat as local wall time.
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function uploadBannerImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage.from("site-banner").upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function saveSiteBannerAction(formData: FormData) {
  const { t } = await getI18n();
  const { supabase, userId } = await requireAdminClient();

  const enabled = formData.get("enabled") === "on";
  const bodyKo = String(formData.get("body_ko") || "").trim();
  const bodyEn = String(formData.get("body_en") || "").trim();
  const ctaLabelKo = String(formData.get("cta_label_ko") || "").trim();
  const ctaLabelEn = String(formData.get("cta_label_en") || "").trim();
  const ctaUrl = String(formData.get("cta_url") || "").trim();
  const startsAt = parseDatetimeLocal(String(formData.get("starts_at") || ""));
  const endsAt = parseDatetimeLocal(String(formData.get("ends_at") || ""));
  const clearImage = formData.get("clear_image") === "on";
  const image = formData.get("image");

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

  let imagePath: string | null = current?.image_path ?? null;

  if (clearImage) {
    if (imagePath) {
      await supabase.storage.from("site-banner").remove([imagePath]);
    }
    imagePath = null;
  }

  if (image instanceof File && image.size > 0) {
    try {
      const nextPath = await uploadBannerImage(supabase, userId, image);
      if (imagePath) {
        await supabase.storage.from("site-banner").remove([imagePath]);
      }
      imagePath = nextPath;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.errors.bannerSaveFailed;
      redirect(`/admin?tab=banner&error=${encodeURIComponent(message)}`);
    }
  }

  const payload = {
    id: 1,
    enabled,
    body_ko: bodyKo,
    body_en: bodyEn,
    cta_label_ko: ctaLabelKo,
    cta_label_en: ctaLabelEn,
    cta_url: ctaUrl,
    image_path: imagePath,
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
