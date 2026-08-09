import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { getCurrentProfile } from "@/lib/auth";
import { accountDisplayName } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-brand/10 bg-[color-mix(in_oklab,var(--background)_88%,white)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-2 font-[family-name:var(--font-display)] text-lg tracking-tight text-brand sm:text-xl"
        >
          <BuildingStorefrontIcon className="size-6 shrink-0" aria-hidden />
          <span className="truncate">Church Market</span>
        </Link>
        <SiteNav
          profile={
            profile
              ? {
                  displayName: accountDisplayName(profile),
                  email: profile.email,
                  isAdmin: profile.role === "admin",
                }
              : null
          }
        />
      </div>
    </header>
  );
}
