"use client";

import { GoogleIcon, KakaoIcon } from "@/components/auth/oauth-icons";
import { startOAuthTransition } from "@/components/auth/oauth-transition";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { useI18n } from "@/components/locale-provider";
import { signInWithOAuth } from "@/lib/actions/auth";

export function OAuthForm({
  provider,
  next,
}: {
  provider: "google" | "kakao";
  next: string;
}) {
  const { t } = useI18n();
  const isKakao = provider === "kakao";
  const action = signInWithOAuth.bind(null, provider, next);

  return (
    <form
      action={action}
      onSubmit={() => startOAuthTransition(provider)}
    >
      <PendingSubmitButton
        pendingLabel={t.common.loading}
        className={
          isKakao
            ? "inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#191600] transition hover:brightness-[0.97] disabled:cursor-wait disabled:opacity-70"
            : "inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:border-black/20 hover:bg-[#fafafa] disabled:cursor-wait disabled:opacity-70"
        }
      >
        {isKakao ? <KakaoIcon /> : <GoogleIcon />}
        {isKakao ? t.auth.continueKakao : t.auth.continueGoogle}
      </PendingSubmitButton>
    </form>
  );
}
