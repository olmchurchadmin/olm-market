import Link from "next/link";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { notFound, redirect } from "next/navigation";
import { BoardForm } from "@/components/board-form";
import { BoardPostGallery } from "@/components/board-post-gallery";
import { DeleteBoardButton } from "@/components/delete-board-button";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  createBoardReplyAction,
  deleteBoardPostAction,
  deleteBoardReplyAction,
} from "@/lib/actions/board";
import { getCurrentProfile, isStaffRole, isSuperAdminRole } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { accountDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BoardPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { locale, t } = await getI18n();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?next=/board/${id}`);
  }

  const supabase = await createClient();
  const [{ data: post }, { data: replies }, { data: images }] =
    await Promise.all([
      supabase
        .from("board_posts")
        .select(
          "id, title, body, created_at, updated_at, author_id, author:profiles!board_posts_author_id_fkey(nickname, full_name, email)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("board_replies")
        .select(
          "id, body, created_at, author_id, author:profiles!board_replies_author_id_fkey(nickname, full_name, email)",
        )
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("board_post_images")
        .select("id, storage_path, sort_order")
        .eq("post_id", id)
        .order("sort_order", { ascending: true }),
    ]);

  if (!post) notFound();

  const author = Array.isArray(post.author) ? post.author[0] : post.author;
  const isAuthor = post.author_id === profile.id;
  const isStaff = isStaffRole(profile.role);
  const canDeletePost = isSuperAdminRole(profile.role);
  const showPostActions = isAuthor || canDeletePost;
  const galleryImages = (images || []).map((img) => ({
    id: img.id,
    storage_path: img.storage_path,
  }));

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/board"
        className="text-sm text-ink-muted hover:text-brand hover:underline"
      >
        ← {t.board.back}
      </Link>

      <article className="relative mt-6 rounded-md border border-black/6 bg-white p-5 sm:p-6">
        {showPostActions ? (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 sm:top-4 sm:right-4">
            {isAuthor ? (
              <Link
                href={`/board/${post.id}/edit`}
                aria-label={t.board.edit}
                title={t.board.edit}
                className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-brand/5 hover:text-brand"
              >
                <PencilSquareIcon className="size-4" aria-hidden />
              </Link>
            ) : null}
            {canDeletePost ? (
              <DeleteBoardButton
                action={deleteBoardPostAction}
                fields={{ post_id: post.id }}
                label={t.board.delete}
                title={t.board.deletePostTitle}
                message={t.board.deletePostMessage}
                variant="icon"
              />
            ) : null}
          </div>
        ) : null}

        <h1
          className={`break-words font-[family-name:var(--font-display)] text-3xl text-foreground ${
            showPostActions ? "pr-16" : ""
          }`}
        >
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t.board.author}: {accountDisplayName(author)} ·{" "}
          {new Date(post.created_at).toLocaleString(
            locale === "en" ? "en-US" : "ko-KR",
          )}
        </p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed text-foreground">
          {post.body}
        </p>

        <BoardPostGallery title={post.title} images={galleryImages} />
      </article>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
          {t.board.replies}
          {(replies || []).length ? ` (${replies!.length})` : ""}
        </h2>

        {(replies || []).length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{t.board.noReplies}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(replies || []).map((reply) => {
              const replyAuthor = Array.isArray(reply.author)
                ? reply.author[0]
                : reply.author;
              const canManageReply =
                reply.author_id === profile.id || isStaff;
              return (
                <li
                  key={reply.id}
                  className="relative rounded-md border border-black/6 bg-white px-4 py-3"
                >
                  {canManageReply ? (
                    <div className="absolute top-2 right-2">
                      <DeleteBoardButton
                        action={deleteBoardReplyAction}
                        fields={{ post_id: post.id, reply_id: reply.id }}
                        label={t.board.delete}
                        title={t.board.deleteReplyTitle}
                        message={t.board.deleteReplyMessage}
                        variant="icon"
                      />
                    </div>
                  ) : null}
                  <p
                    className={`text-xs text-ink-muted ${
                      canManageReply ? "pr-10" : ""
                    }`}
                  >
                    {accountDisplayName(replyAuthor)} ·{" "}
                    {new Date(reply.created_at).toLocaleString(
                      locale === "en" ? "en-US" : "ko-KR",
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {reply.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <BoardForm
          action={createBoardReplyAction}
          initialError={error || null}
          className="mt-6 space-y-3"
        >
          <input type="hidden" name="post_id" value={post.id} />
          <label className="block text-sm font-medium">
            {t.board.replies}
            <textarea
              name="body"
              required
              rows={4}
              placeholder={t.board.replyPlaceholder}
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 font-normal outline-none focus:border-brand"
            />
          </label>
          <PendingSubmitButton pendingLabel={t.common.loading}>
            {t.board.replySubmit}
          </PendingSubmitButton>
        </BoardForm>
      </section>
    </main>
  );
}
