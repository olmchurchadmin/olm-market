import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getSessionUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Initial signup used to put the captured name in full_name (본명).
 * Prefer nickname (이름); leave 본명 empty until the user fills it in.
 */
async function normalizeInitialDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
): Promise<Profile> {
  const nickname = profile.nickname?.trim() || "";
  const fullName = profile.full_name?.trim() || "";

  // Legacy: only 본명 filled → move to 이름
  if (!nickname && fullName) {
    const { data } = await supabase
      .from("profiles")
      .update({ nickname: fullName, full_name: null })
      .eq("id", profile.id)
      .select("*")
      .maybeSingle();
    if (data) {
      return {
        ...data,
        nickname: data.nickname ?? null,
        is_anonymous: Boolean(data.is_anonymous),
      } as Profile;
    }
    return { ...profile, nickname: fullName, full_name: null };
  }

  // Older trigger set the same value into both columns → keep 이름 only
  if (nickname && fullName && nickname === fullName) {
    const { data } = await supabase
      .from("profiles")
      .update({ full_name: null })
      .eq("id", profile.id)
      .select("*")
      .maybeSingle();
    if (data) {
      return {
        ...data,
        nickname: data.nickname ?? null,
        is_anonymous: Boolean(data.is_anonymous),
      } as Profile;
    }
    return { ...profile, full_name: null };
  }

  return profile;
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  const profile = {
    ...data,
    nickname: data.nickname ?? null,
    is_anonymous: Boolean(data.is_anonymous),
  } as Profile;

  return normalizeInitialDisplayName(supabase, profile);
});

export async function requireAdmin() {
  const { redirect } = await import("next/navigation");
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }
  return profile as Profile;
}
