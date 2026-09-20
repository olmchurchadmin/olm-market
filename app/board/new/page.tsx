import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardForm } from "@/components/board-form";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createBoardPostAction } from "@/lib/actions/board";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewBoardPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { t } = await getI18n();
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/board/new");
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-foreground">
        {t.board.newTitle}
      </h1>
      <p className="mt-2 text-ink-muted">{t.board.blurb}</p>

      <BoardForm action={createBoardPostAction} initialError={error || null}>
        <label className="block text-sm font-medium">
          {t.board.titleLabel}
          <input
            name="title"
            required
            maxLength={120}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm font-medium">
          {t.board.bodyLabel}
          <textarea
            name="body"
            required
            rows={8}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <PendingSubmitButton pendingLabel={t.common.loading}>
            {t.board.submit}
          </PendingSubmitButton>
          <Link
            href="/board"
            className="rounded-md border border-brand/15 bg-white px-5 py-3 text-sm font-medium text-foreground hover:bg-brand/5"
          >
            {t.board.cancel}
          </Link>
        </div>
      </BoardForm>
    </main>
  );
}
