"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function resetAdminStatsAction() {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: t.errors.loginRequired };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: t.errors.cannotEdit };
  }

  const { error } = await supabase.rpc("admin_reset_stats");
  if (error) {
    return {
      ok: false as const,
      error: error.message || t.admin.resetStatsFailed,
    };
  }

  revalidatePath("/admin");
  return { ok: true as const };
}
