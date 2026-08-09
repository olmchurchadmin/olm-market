import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { EmailAuthPanel } from "@/components/auth/email-auth-panel";
import { signInWithOAuth } from "@/lib/actions/auth";
import { getI18n } from "@/lib/i18n/server";

type Mode = "signin" | "signup" | "forgot";

function parseMode(value?: string): Mode {
  if (value === "signup" || value === "forgot") return value;
  return "signin";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    mode?: string;
    sent?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const next = params.next || "/market";
  const mode = parseMode(params.mode);
  const { t } = await getI18n();

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    signin: {
      title: t.auth.signIn,
      subtitle: t.auth.signInSubtitle,
    },
    signup: {
      title: t.auth.signUp,
      subtitle: t.auth.signUpSubtitle,
    },
    forgot: {
      title: t.auth.forgot,
      subtitle: t.auth.forgotSubtitle,
    },
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-brand">
        {titles[mode].title}
      </h1>
      <p className="mt-2 text-ink-muted">{titles[mode].subtitle}</p>

      {mode === "signin" ? (
        <>
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
                {t.auth.continueGoogle}
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
                {t.auth.continueKakao}
              </button>
            </form>
          </div>

          <div className="my-8 flex items-center gap-3 text-xs tracking-wide text-ink-muted uppercase">
            <div className="h-px flex-1 bg-brand/15" />
            {t.auth.orEmail}
            <div className="h-px flex-1 bg-brand/15" />
          </div>
        </>
      ) : (
        <div className="mt-8" />
      )}

      <EmailAuthPanel
        mode={mode}
        next={next}
        error={params.error}
        sent={params.sent}
      />

      <p className="mt-8 text-center text-sm text-ink-muted">
        <Link
          href="/market"
          className="inline-flex items-center gap-1.5 underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t.auth.backToMarket}
        </Link>
      </p>
    </main>
  );
}
