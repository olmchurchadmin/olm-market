import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { EmailAuthPanel } from "@/components/auth/email-auth-panel";
import { GoogleIcon, KakaoIcon } from "@/components/auth/oauth-icons";
import { BrandLogo } from "@/components/brand-logo";
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
  const next = params.next || "/";
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
    <main className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="animate-rise rounded-2xl border border-black/6 bg-white/90 p-6 shadow-[0_20px_50px_rgba(26,28,31,0.08)] sm:p-8">
        <div className="mb-6 flex justify-center sm:mb-8">
          <BrandLogo className="[&_img]:h-10 [&_img]:max-w-[260px] sm:[&_img]:h-11" />
        </div>

        <h1 className="text-center font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
          {titles[mode].title}
        </h1>
        <p className="mt-2 text-center text-sm text-ink-muted sm:text-base">
          {titles[mode].subtitle}
        </p>

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
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-black/20 hover:bg-[#fafafa]"
                >
                  <GoogleIcon />
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
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191600] transition hover:brightness-[0.97]"
                >
                  <KakaoIcon />
                  {t.auth.continueKakao}
                </button>
              </form>
            </div>

            <div className="my-7 flex items-center gap-3 text-[11px] tracking-[0.14em] text-ink-muted uppercase">
              <div className="h-px flex-1 bg-black/10" />
              {t.auth.orEmail}
              <div className="h-px flex-1 bg-black/10" />
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
      </div>

      <p className="mt-8 text-center text-sm text-ink-muted">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 underline decoration-black/20 underline-offset-4 hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t.auth.backToMarket}
        </Link>
      </p>
    </main>
  );
}
