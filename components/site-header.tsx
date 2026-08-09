import {
  ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { getCurrentProfile } from "@/lib/auth";
import { accountDisplayName } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-brand/10 bg-[color-mix(in_oklab,var(--background)_88%,white)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-tight text-brand"
        >
          <BuildingStorefrontIcon className="size-6" aria-hidden />
          Church Market
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-foreground sm:gap-2">
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-brand/5 hover:text-brand"
          >
            <BuildingStorefrontIcon className="size-4" aria-hidden />
            장터
          </Link>
          <Link
            href="/sell"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-brand/5 hover:text-brand"
          >
            <PlusCircleIcon className="size-4" aria-hidden />
            판매등록
          </Link>
          {profile ? (
            <UserMenu
              displayName={accountDisplayName(profile)}
              email={profile.email}
              isAdmin={profile.role === "admin"}
            />
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-soft"
            >
              <ArrowRightOnRectangleIcon className="size-4" aria-hidden />
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
