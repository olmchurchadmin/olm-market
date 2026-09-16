"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import {
  clearOAuthTransition,
  OAUTH_TRANSITION_EVENT,
  readOAuthTransition,
} from "@/components/auth/oauth-transition";

export function OAuthTransitionGuard() {
  const { t } = useI18n();
  const [provider, setProvider] = useState<"google" | "kakao" | null>(null);

  const sync = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("oauthComplete")) {
      clearOAuthTransition();
      url.searchParams.delete("oauthComplete");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      setProvider(null);
      return;
    }
    setProvider(readOAuthTransition()?.provider ?? null);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(OAUTH_TRANSITION_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener(OAUTH_TRANSITION_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [sync]);

  if (!provider) return null;

  const isKakao = provider === "kakao";

  return (
    <div
      className="fixed inset-0 z-[500] flex min-h-dvh items-center justify-center bg-white/96 px-6 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="w-full max-w-sm text-center">
        <div
          className={`mx-auto size-12 animate-spin rounded-full border-4 border-neutral-200 ${
            isKakao ? "border-t-[#FEE500]" : "border-t-brand"
          }`}
          aria-hidden
        />
        <h2 className="mt-5 text-xl font-semibold text-foreground">
          {isKakao ? t.auth.kakaoCompleting : t.auth.oauthCompleting}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {isKakao ? t.auth.kakaoCompletingHint : t.auth.oauthCompletingHint}
        </p>
        <button
          type="button"
          onClick={() => {
            clearOAuthTransition();
            setProvider(null);
          }}
          className="mt-8 rounded-md border border-brand/15 bg-white px-4 py-2 text-sm font-medium text-ink-muted hover:bg-neutral-50 hover:text-foreground"
        >
          {t.auth.cancelOAuth}
        </button>
      </div>
    </div>
  );
}
