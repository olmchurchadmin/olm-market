import Link from "next/link";
import { confirmEmailAction } from "@/lib/actions/auth";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
    error?: string;
  }>;
}) {
  const { t } = await getI18n();
  const params = await searchParams;
  const tokenHash = String(params.token_hash || "").trim();
  const type = String(params.type || "signup").trim();
  let next = String(params.next || "/");
  if (!next.startsWith("/")) next = "/";

  if (!tokenHash) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-md border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-800">
          {params.error || t.errors.emailLinkInvalid}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t.auth.backToSignIn}
          </Link>
        </p>
      </main>
    );
  }

  const isRecovery = type === "recovery";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-md border border-black/6 bg-white/90 p-6 shadow-[0_20px_50px_rgba(26,28,31,0.08)] sm:p-8">
        <h1 className="text-center font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground">
          {isRecovery ? t.auth.confirmRecoveryTitle : t.auth.confirmEmailTitle}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-ink-muted">
          {isRecovery ? t.auth.confirmRecoveryBlurb : t.auth.confirmEmailBlurb}
        </p>
        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {params.error}
          </p>
        ) : null}
        <form action={confirmEmailAction} className="mt-8">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            {isRecovery ? t.auth.confirmRecoveryCta : t.auth.confirmEmailCta}
          </button>
        </form>
      </div>
    </main>
  );
}
