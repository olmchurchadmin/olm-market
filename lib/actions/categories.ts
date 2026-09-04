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
  if (!user) redirect("/login?next=/admin?tab=categories");

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

function slugifyCategory(nameEn: string, nameKo: string) {
  const fromEn = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  if (fromEn) return fromEn;
  return `cat-${Date.now().toString(36)}`;
}

export async function createCategoryAction(formData: FormData) {
  const { t } = await getI18n();
  const nameKo = String(formData.get("name_ko") || "").trim();
  const nameEn = String(formData.get("name_en") || "").trim();

  if (!nameKo) {
    redirect(
      `/admin?tab=categories&error=${encodeURIComponent(t.errors.categoryNameRequired)}`,
    );
  }

  const supabase = await requireAdminClient();
  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;
  let slug = slugifyCategory(nameEn, nameKo);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { error } = await supabase.from("categories").insert({
      slug: candidate,
      name_ko: nameKo,
      name_en: nameEn || null,
      sort_order: sortOrder,
    });
    if (!error) {
      revalidatePath("/admin");
      revalidatePath("/");
      revalidatePath("/sell");
      redirect("/admin?tab=categories&categoryAdded=1");
    }
    if (!error.message?.toLowerCase().includes("duplicate")) {
      redirect(
        `/admin?tab=categories&error=${encodeURIComponent(error.message || t.errors.categoryCreateFailed)}`,
      );
    }
  }

  redirect(
    `/admin?tab=categories&error=${encodeURIComponent(t.errors.categoryCreateFailed)}`,
  );
}

export async function deleteCategoryAction(formData: FormData) {
  const { t } = await getI18n();
  const categoryId = String(formData.get("category_id") || "").trim();
  if (!categoryId) {
    redirect(
      `/admin?tab=categories&error=${encodeURIComponent(t.errors.categoryDeleteFailed)}`,
    );
  }

  const supabase = await requireAdminClient();
  const { count, error: countError } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .neq("status", "cancelled");

  if (countError) {
    redirect(
      `/admin?tab=categories&error=${encodeURIComponent(countError.message || t.errors.categoryDeleteFailed)}`,
    );
  }
  if ((count || 0) > 0) {
    redirect(
      `/admin?tab=categories&error=${encodeURIComponent(t.errors.categoryDeleteInUse)}`,
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    redirect(
      `/admin?tab=categories&error=${encodeURIComponent(error.message || t.errors.categoryDeleteFailed)}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/sell");
  redirect("/admin?tab=categories&categoryDeleted=1");
}

export async function reorderCategoriesAction(formData: FormData) {
  const { t } = await getI18n();
  const raw = String(formData.get("ordered_ids") || "").trim();
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      ids = parsed.map((id) => String(id)).filter(Boolean);
    }
  } catch {
    ids = [];
  }

  if (!ids.length) {
    redirect(
      `/admin?tab=categories&error=${encodeURIComponent(t.errors.categoryReorderFailed)}`,
    );
  }

  const supabase = await requireAdminClient();
  for (let i = 0; i < ids.length; i += 1) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: i + 1 })
      .eq("id", ids[i]);
    if (error) {
      redirect(
        `/admin?tab=categories&error=${encodeURIComponent(error.message || t.errors.categoryReorderFailed)}`,
      );
    }
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/sell");
  redirect("/admin?tab=categories&categoryReordered=1");
}
