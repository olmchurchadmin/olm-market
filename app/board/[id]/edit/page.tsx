import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BoardForm } from "@/components/board-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { updateBoardPostAction } from "@/lib/actions/board";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditBoardPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { t } = await getI18n();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?next=/board/${id}/edit`);
  }

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("board_posts")
    .select("id, title, body, author_id")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();
  if (post.author_id !== profile.id) {
    redirect(`/board/${id}`);
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-foreground">
        {t.board.editTitle}
      </h1>

      <BoardForm action={updateBoardPostAction} initialError={error || null}>
        <input type="hidden" name="post_id" value={post.id} />
        <label className="block text-sm font-medium">
          {t.board.titleLabel}
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={post.title}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm font-medium">
          {t.board.bodyLabel}
          <textarea
            name="body"
            required
            rows={8}
            defaultValue={post.body}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <PendingSubmitButton pendingLabel={t.common.loading}>
            {t.board.save}
          </PendingSubmitButton>
          <Link
            href={`/board/${post.id}`}
            className="rounded-md border border-brand/15 bg-white px-5 py-3 text-sm font-medium text-foreground hover:bg-brand/5"
          >
            {t.board.cancel}
          </Link>
        </div>
      </BoardForm>
    </main>
  );
}
