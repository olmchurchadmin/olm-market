import { ArrowLeftIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { signInWithEmail, signInWithOAuth } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/market";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-brand">
        로그인
      </h1>
      <p className="mt-2 text-ink-muted">
        Google, 카카오, 이메일 중 하나로 시작하세요.
      </p>

      {params.sent ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-white/70 px-4 py-3 text-sm text-brand">
          매직 링크를 이메일로 보냈습니다. 받은편지함을 확인해 주세요.
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          로그인에 실패했습니다. 다시 시도해 주세요.
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        <form
          action={async () => {
            "use server";
            await signInWithOAuth("google", next);
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md border border-brand/15 bg-white px-4 py-3 text-sm font-semibold text-foreground hover:border-brand/30"
          >
            Google로 계속
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signInWithOAuth("kakao", next);
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191600] hover:brightness-95"
          >
            카카오로 계속
          </button>
        </form>
      </div>

      <div className="my-8 flex items-center gap-3 text-xs tracking-wide text-ink-muted uppercase">
        <div className="h-px flex-1 bg-brand/15" />
        또는 이메일
        <div className="h-px flex-1 bg-brand/15" />
      </div>

      <form action={signInWithEmail} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm font-medium text-foreground">
          이메일
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
        >
          <EnvelopeIcon className="size-5" aria-hidden />
          매직 링크 받기
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        <Link
          href="/market"
          className="inline-flex items-center gap-1.5 underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          장터로 돌아가기
        </Link>
      </p>
    </main>
  );
}
