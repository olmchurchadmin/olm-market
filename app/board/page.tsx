import Link from "next/link";
import { ChatBubbleLeftRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { accountDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { locale, t } = await getI18n();
  const { deleted } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?next=/board`);
  }

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("board_posts")
    .select(
      "id, title, body, created_at, author_id, author:profiles!board_posts_author_id_fkey(nickname, full_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: replyCounts } = await supabase
    .from("board_replies")
    .select("post_id");

  const countByPost = new Map<string, number>();
  for (const row of replyCounts || []) {
    countByPost.set(row.post_id, (countByPost.get(row.post_id) || 0) + 1);
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-4xl text-foreground">
            <ChatBubbleLeftRightIcon className="size-8" aria-hidden />
            {t.board.title}
          </h1>
          <p className="mt-2 text-ink-muted">{t.board.blurb}</p>
        </div>
        <Link
          href="/board/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
        >
          <PlusIcon className="size-4" aria-hidden />
          {t.board.write}
        </Link>
      </div>

      {deleted ? (
        <p className="mt-4 rounded-md border border-brand/15 bg-brand/5 px-3 py-2 text-sm text-foreground">
          {t.board.deletedFlash}
        </p>
      ) : null}

      {(posts || []).length === 0 ? (
        <p className="mt-10 text-sm text-ink-muted">{t.board.empty}</p>
      ) : (
        <ul className="mt-8 divide-y divide-black/6 rounded-md border border-black/6 bg-white">
          {(posts || []).map((post) => {
            const author = Array.isArray(post.author)
              ? post.author[0]
              : post.author;
            const replies = countByPost.get(post.id) || 0;
            return (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="block px-4 py-4 transition hover:bg-brand/5"
                >
                  <p className="font-medium text-foreground">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {post.body}
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {accountDisplayName(author)} ·{" "}
                    {new Date(post.created_at).toLocaleString(
                      locale === "en" ? "en-US" : "ko-KR",
                    )}
                    {replies > 0
                      ? ` · ${t.board.replies} ${replies}`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
