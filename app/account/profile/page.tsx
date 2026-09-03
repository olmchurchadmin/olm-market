import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  EyeSlashIcon,
  KeyIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
import { DeleteAccountButton } from "@/components/delete-account-button";
import {
  updatePasswordAction,
  updateProfileAction,
} from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { accountDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const profile = await getCurrentProfile();
  const { t } = await getI18n();
  const { error, saved } = await searchParams;

  if (!profile) return null;

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${profile.email || ""}`}
      active="profile"
    >
      {error ? (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {saved === "profile" || saved === "phone" ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.account.profileSaved}
        </p>
      ) : null}
      {saved === "password" ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.account.passwordSaved}
        </p>
      ) : null}

      <section className="rounded-lg border border-brand/10 bg-white/70 p-5">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <UserIcon className="size-6" aria-hidden />
          {t.account.myProfile}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t.account.profileBlurb}</p>
        <p className="mt-2 text-xs text-ink-muted">{t.account.notificationsBlurb}</p>
        <form action={updateProfileAction} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t.account.displayName}
            </span>
            <input
              name="display_name"
              defaultValue={profile.nickname || ""}
              maxLength={40}
              placeholder={t.account.displayNamePlaceholder}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
            <span className="text-xs text-ink-muted">
              {t.account.displayNameHint}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t.account.legalName}
            </span>
            <input
              name="full_name"
              defaultValue={profile.full_name || ""}
              maxLength={80}
              placeholder={t.account.legalNamePlaceholder}
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
            <span className="text-xs text-ink-muted">
              {t.account.legalNameHint}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <DevicePhoneMobileIcon className="size-4" aria-hidden />
              {t.account.phone}
            </span>
            <input
              name="phone"
              defaultValue={profile.phone || ""}
              placeholder="01012345678"
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
            <span className="text-xs text-ink-muted">{t.account.phoneHint}</span>
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <EnvelopeIcon className="size-4" aria-hidden />
              {t.account.notificationEmail}
            </span>
            <input
              type="email"
              name="notification_email"
              defaultValue={profile.notification_email || profile.email || ""}
              placeholder="you@example.com"
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
            <span className="text-xs text-ink-muted">
              {t.account.notificationEmailHint}
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-md border border-brand/10 bg-[color-mix(in_oklab,var(--background)_70%,white)] px-3 py-3">
            <input
              type="checkbox"
              name="is_anonymous"
              defaultChecked={Boolean(profile.is_anonymous)}
              className="mt-1 size-4 rounded border-brand/30 text-brand"
            />
            <span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <EyeSlashIcon className="size-4" aria-hidden />
                {t.account.anonymous}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {t.account.anonymousHint}
              </span>
            </span>
          </label>

          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            {t.account.saveProfile}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-brand/10 bg-white/70 p-5">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <KeyIcon className="size-6" aria-hidden />
          {t.account.changePassword}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t.account.passwordBlurb}</p>
        <form action={updatePasswordAction} className="mt-5 space-y-4">
          <input type="hidden" name="next" value="/account/profile" />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t.account.newPassword}
            </span>
            <input
              type="password"
              name="password"
              minLength={6}
              required
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t.account.confirmNewPassword}
            </span>
            <input
              type="password"
              name="confirm"
              minLength={6}
              required
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="mt-3 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            {t.account.changePasswordCta}
          </button>
        </form>
      </section>

      {profile.role !== "admin" ? (
        <section className="mt-8 rounded-lg border border-red-200/80 bg-red-50/40 p-5">
          <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-red-900">
            <TrashIcon className="size-6" aria-hidden />
            {t.account.deleteAccount}
          </h2>
          <p className="mt-1 text-sm text-red-900/80">
            {t.account.deleteAccountBlurb}
          </p>
          <p className="mt-2 text-sm font-medium text-red-800">
            {t.account.deleteAccountWarning}
          </p>
          <div className="mt-4">
            <DeleteAccountButton />
          </div>
        </section>
      ) : null}
    </AccountShell>
  );
}
