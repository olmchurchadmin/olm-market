import { createClient } from "@/lib/supabase/server";

export const BOARD_PAGE_SIZE = 20;

export type BoardListAuthor = {
  nickname: string | null;
  full_name: string | null;
  email: string | null;
} | null;

export type BoardListPost = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  author: BoardListAuthor;
  thumb_path: string | null;
  reply_count: number;
  is_notice: boolean;
};

type RawPost = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string;
  is_notice?: boolean | null;
  author:
    | BoardListAuthor
    | BoardListAuthor[]
    | null;
  board_post_images?: Array<{
    storage_path: string;
    sort_order: number;
  }> | null;
};

function normalizeAuthor(
  author: RawPost["author"],
): BoardListAuthor {
  if (!author) return null;
  return Array.isArray(author) ? author[0] ?? null : author;
}

function firstImagePath(
  images: RawPost["board_post_images"],
): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.storage_path ?? null;
}

export async function fetchBoardPostsPage(options: {
  page: number;
  pageSize?: number;
}): Promise<{ items: BoardListPost[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, Math.floor(options.page) || 1);
  const pageSize = options.pageSize ?? BOARD_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const selectWithNotice =
    "id, title, body, created_at, author_id, is_notice, author:profiles!board_posts_author_id_fkey(nickname, full_name, email), board_post_images(storage_path, sort_order)";
  const selectWithImages =
    "id, title, body, created_at, author_id, author:profiles!board_posts_author_id_fkey(nickname, full_name, email), board_post_images(storage_path, sort_order)";
  const selectPlain =
    "id, title, body, created_at, author_id, author:profiles!board_posts_author_id_fkey(nickname, full_name, email)";

  let data: RawPost[] | null = null;
  let count: number | null = null;
  let error: { message?: string } | null = null;

  {
    const first = await supabase
      .from("board_posts")
      .select(selectWithNotice, { count: "exact" })
      .order("is_notice", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    data = (first.data as RawPost[] | null) ?? null;
    count = first.count;
    error = first.error;
  }

  if (error) {
    const second = await supabase
      .from("board_posts")
      .select(selectWithImages, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    data = (second.data as RawPost[] | null) ?? null;
    count = second.count;
    error = second.error;
  }

  if (error) {
    const fallback = await supabase
      .from("board_posts")
      .select(selectPlain, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (fallback.error) throw fallback.error;
    data = (fallback.data as RawPost[] | null) ?? null;
    count = fallback.count;
  }

  const rows = (data || []) as RawPost[];
  const postIds = rows.map((row) => row.id);
  const replyCountByPost = new Map<string, number>();

  if (postIds.length) {
    const { data: replies } = await supabase
      .from("board_replies")
      .select("post_id")
      .in("post_id", postIds);
    for (const row of replies || []) {
      replyCountByPost.set(
        row.post_id,
        (replyCountByPost.get(row.post_id) || 0) + 1,
      );
    }
  }

  const items: BoardListPost[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    created_at: row.created_at,
    author_id: row.author_id,
    author: normalizeAuthor(row.author),
    thumb_path: firstImagePath(row.board_post_images),
    reply_count: replyCountByPost.get(row.id) || 0,
    is_notice: Boolean(row.is_notice),
  }));

  const total = count ?? items.length;
  return {
    items,
    total,
    hasMore: from + items.length < total,
  };
}
