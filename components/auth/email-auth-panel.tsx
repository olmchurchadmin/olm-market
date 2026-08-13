"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import {
  requestPasswordResetAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/lib/actions/auth";

type Mode = "signin" | "signup" | "forgot";

export function EmailAuthPanel({
  mode,
  next,
  error,
  sent,
}: {
  mode: Mode;
  next: string;
  error?: string;
  sent?: string;
}) {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      {sent === "signup" ? (
        <p className="rounded-md border border-brand/20 bg-white/70 px-4 py-3 text-sm text-brand">
          {t.auth.signupSent}
        </p>
      ) : null}
      {sent === "reset" ? (
        <p className="rounded-md border border-brand/20 bg-white/70 px-4 py-3 text-sm text-brand">
          {t.auth.resetSent}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {mode === "signin" ? (
        <form action={signInWithPasswordAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-medium">
            {t.auth.email}
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            {t.auth.password}
            <span className="relative mt-1 block">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 pr-10 outline-none focus:border-brand"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-brand"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? t.auth.hidePassword : t.auth.showPassword
                }
              >
                {showPassword ? (
                  <EyeSlashIcon className="size-5" />
                ) : (
                  <EyeIcon className="size-5" />
                )}
              </button>
            </span>
          </label>
          <div className="flex justify-end">
            <Link
              href={`/login?mode=forgot&next=${encodeURIComponent(next)}`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {t.auth.forgotLink}
            </Link>
          </div>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            <KeyIcon className="size-5" aria-hidden />
            {t.auth.signInCta}
          </button>
          <p className="text-center text-sm text-ink-muted">
            {t.auth.needAccount}{" "}
            <Link
              href={`/login?mode=signup&next=${encodeURIComponent(next)}`}
              className="font-semibold text-brand hover:underline"
            >
              {t.auth.signUp}
            </Link>
          </p>
        </form>
      ) : null}

      {mode === "signup" ? (
        <form action={signUpWithPasswordAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-medium">
            {t.auth.email}
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            {t.auth.password}
            <input
              type="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            {t.auth.confirmPassword}
            <input
              type="password"
              name="confirm"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            <UserPlusIcon className="size-5" aria-hidden />
            {t.auth.signUpCta}
          </button>
          <p className="text-center text-sm text-ink-muted">
            {t.auth.haveAccount}{" "}
            <Link
              href={`/login?mode=signin&next=${encodeURIComponent(next)}`}
              className="font-semibold text-brand hover:underline"
            >
              {t.auth.signIn}
            </Link>
          </p>
        </form>
      ) : null}

      {mode === "forgot" ? (
        <form action={requestPasswordResetAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <p className="text-sm text-ink-muted">{t.auth.forgotHint}</p>
          <label className="block text-sm font-medium">
            {t.auth.email}
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            <EnvelopeIcon className="size-5" aria-hidden />
            {t.auth.sendReset}
          </button>
          <p className="text-center text-sm text-ink-muted">
            <Link
              href={`/login?mode=signin&next=${encodeURIComponent(next)}`}
              className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t.auth.backToSignIn}
            </Link>
          </p>
        </form>
      ) : null}
    </div>
  );
}
