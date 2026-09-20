import Link from "next/link";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { redirect } from "next/navigation";
import { BoardInfiniteList } from "@/components/board-infinite-list";
import { getCurrentProfile } from "@/lib/auth";
import { BOARD_PAGE_SIZE, fetchBoardPostsPage } from "@/lib/board/posts-query";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { t } = await getI18n();
  const { deleted } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?next=/board`);
  }

  const firstPage = await fetchBoardPostsPage({
    page: 1,
    pageSize: BOARD_PAGE_SIZE,
  });

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

      <BoardInfiniteList
        initialItems={firstPage.items}
        total={firstPage.total}
      />
    </main>
  );
}
