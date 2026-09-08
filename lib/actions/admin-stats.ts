"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats } from "@/lib/types";

type StatsRange = "all" | "week" | "month";

async function requireAdminClient() {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      error: t.errors.loginRequired,
      supabase: null as null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      ok: false as const,
      error: t.errors.cannotEdit,
      supabase: null as null,
    };
  }

  return { ok: true as const, error: null as null, supabase };
}

export async function loadAdminStatsRangeAction(range: StatsRange) {
  const auth = await requireAdminClient();
  if (!auth.ok || !auth.supabase) {
    return { ok: false as const, error: auth.error };
  }

  const { data, error } = await auth.supabase.rpc("admin_stats", {
    p_range: range,
  });
  if (error || !data) {
    const { t } = await getI18n();
    return {
      ok: false as const,
      error: error?.message || t.errors.actionFailed,
    };
  }

  return { ok: true as const, stats: data as AdminStats };
}

export async function resetAdminStatsAction() {
  const { t } = await getI18n();
  const auth = await requireAdminClient();
  if (!auth.ok || !auth.supabase) {
    return { ok: false as const, error: auth.error || t.errors.cannotEdit };
  }

  const { error } = await auth.supabase.rpc("admin_reset_stats");
  if (error) {
    return {
      ok: false as const,
      error: error.message || t.admin.resetStatsFailed,
    };
  }

  revalidatePath("/admin");
  return { ok: true as const };
}
