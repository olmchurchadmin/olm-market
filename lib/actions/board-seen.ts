"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Persist board visit cursor. Call only from a client effect / server action. */
export async function markBoardSeenAction() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return;

    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ board_last_seen_at: new Date().toISOString() })
      .eq("id", profile.id);
  } catch {
    // Missing column / RLS must not break the board UI.
  }
}
