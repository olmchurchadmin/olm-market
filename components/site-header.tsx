import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteNav } from "@/components/site-nav";
import { isStaffRole } from "@/lib/roles";
import type { Profile } from "@/lib/types";
import { accountDisplayName } from "@/lib/utils";

export function SiteHeader({
  profile,
  boardUnreadCount = 0,
}: {
  profile: Profile | null;
  boardUnreadCount?: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/6 bg-[color-mix(in_oklab,var(--background)_72%,white)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
        <BrandLogo priority className="shrink" />
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <SiteNav
            profile={
              profile
                ? {
                    displayName: accountDisplayName(profile),
                    email: profile.email,
                    isAdmin: isStaffRole(profile.role),
                  }
                : null
            }
            boardUnreadCount={profile ? boardUnreadCount : 0}
          />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
