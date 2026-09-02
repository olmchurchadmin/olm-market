import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { SiteNav } from "@/components/site-nav";
import type { Profile } from "@/lib/types";
import { accountDisplayName } from "@/lib/utils";

export function SiteHeader({ profile }: { profile: Profile | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/6 bg-[color-mix(in_oklab,var(--background)_72%,white)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
        <BrandLogo priority />
        <div className="flex items-center gap-0.5 sm:gap-1">
          {profile ? <NotificationBell /> : null}
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
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
