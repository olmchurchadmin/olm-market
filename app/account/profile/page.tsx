import {
  DevicePhoneMobileIcon,
  EyeSlashIcon,
  KeyIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
import {
  updatePasswordAction,
  updateProfileAction,
} from "@/lib/actions/auth";
import { getCurrentProfile } from "@/lib/auth";
import { accountDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const profile = await getCurrentProfile();
  const { error, saved } = await searchParams;

  if (!profile) return null;

  return (
    <AccountShell
      title="My Account"
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
          프로필이 저장되었습니다.
        </p>
      ) : null}
      {saved === "password" ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          비밀번호가 변경되었습니다.
        </p>
      ) : null}

      <section className="rounded-lg border border-brand/10 bg-white/70 p-5">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-brand">
          <UserIcon className="size-6" aria-hidden />
          My Profile
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          장터에 보이는 이름과 연락처를 설정하세요.
        </p>
        <form action={updateProfileAction} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">닉네임</span>
            <input
              name="nickname"
              defaultValue={profile.nickname || ""}
              maxLength={40}
              placeholder="장터에 표시할 이름"
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <DevicePhoneMobileIcon className="size-4" aria-hidden />
              전화번호
            </span>
            <input
              name="phone"
              defaultValue={profile.phone || ""}
              placeholder="01012345678"
              className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
            />
            <span className="text-xs text-ink-muted">
              카카오 알림을 받으려면 휴대폰 번호를 저장해 주세요.
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
                익명으로 판매
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                켜면 장터에 올린 물건의 판매자가 &quot;익명&quot;으로 표시됩니다.
              </span>
            </span>
          </label>

          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            프로필 저장
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-brand/10 bg-white/70 p-5">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-brand">
          <KeyIcon className="size-6" aria-hidden />
          비밀번호 변경
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Google로만 가입한 경우에도 여기서 비밀번호를 설정할 수 있습니다.
        </p>
        <form action={updatePasswordAction} className="mt-5 space-y-4">
          <input type="hidden" name="next" value="/account/profile" />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              새 비밀번호
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
              새 비밀번호 확인
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
            className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            비밀번호 변경
          </button>
        </form>
      </section>
    </AccountShell>
  );
}
