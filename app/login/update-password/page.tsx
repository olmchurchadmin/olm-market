import { KeyIcon } from "@heroicons/react/24/outline";
import { updatePasswordAction } from "@/lib/actions/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?mode=forgot&error=" +
        encodeURIComponent(t.auth.noResetSession),
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-foreground">
        {t.auth.updatePasswordTitle}
      </h1>
      <p className="mt-2 text-ink-muted">{t.auth.updatePasswordBlurb}</p>

      {params.error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </p>
      ) : null}

      <form action={updatePasswordAction} className="mt-8 space-y-3">
        <label className="block text-sm font-medium">
          {t.account.newPassword}
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
          {t.account.confirmNewPassword}
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-sun hover:bg-brand-soft"
        >
          <KeyIcon className="size-5" aria-hidden />
          {t.auth.updatePasswordCta}
        </button>
      </form>
    </main>
  );
}
