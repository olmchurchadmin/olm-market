import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BOARD_UNREAD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Count other members' board posts newer than last-seen (within 7 days). */
export const getBoardUnreadCount = cache(async (): Promise<number> => {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return 0;

    const supabase = await createClient();
    const windowStart = new Date(
      Date.now() - BOARD_UNREAD_WINDOW_MS,
    ).toISOString();
    const lastSeen = profile.board_last_seen_at;
    const since =
      lastSeen &&
      new Date(lastSeen).getTime() > Date.now() - BOARD_UNREAD_WINDOW_MS
        ? lastSeen
        : windowStart;

    const { count, error } = await supabase
      .from("board_posts")
      .select("id", { count: "exact", head: true })
      .gt("created_at", since)
      .neq("author_id", profile.id);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
});
