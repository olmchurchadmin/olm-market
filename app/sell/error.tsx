"use client";

import { useI18n } from "@/components/locale-provider";

export default function SellError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-foreground">
        {t.errors.actionFailed}
      </h1>
      <p className="mt-3 text-sm text-ink-muted" role="alert">
        {t.sell.photoProcessFailed}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
      >
        {t.common.tryAgain}
      </button>
    </main>
  );
}
