import Link from "next/link";

export function MarketPagination({
  page,
  totalPages,
  hrefForPage,
  labels,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  labels: {
    prev: string;
    next: string;
    pageOf: string;
  };
}) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="Pagination"
    >
      {prev ? (
        <Link
          href={hrefForPage(prev)}
          className="rounded-xl border border-brand/15 bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-sun"
        >
          {labels.prev}
        </Link>
      ) : (
        <span className="rounded-xl border border-transparent px-3.5 py-2 text-sm text-ink-muted/50">
          {labels.prev}
        </span>
      )}

      <p className="min-w-[7rem] text-center text-sm text-ink-muted">
        {labels.pageOf
          .replace("{page}", String(page))
          .replace("{total}", String(totalPages))}
      </p>

      {next ? (
        <Link
          href={hrefForPage(next)}
          className="rounded-xl border border-brand/15 bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-sun"
        >
          {labels.next}
        </Link>
      ) : (
        <span className="rounded-xl border border-transparent px-3.5 py-2 text-sm text-ink-muted/50">
          {labels.next}
        </span>
      )}
    </nav>
  );
}
