import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteNav } from "@/components/site-nav";
import { getCurrentProfile } from "@/lib/auth";
import { accountDisplayName } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-black/6 bg-[color-mix(in_oklab,var(--background)_72%,white)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
        <BrandLogo priority />
        <div className="flex items-center gap-0.5 sm:gap-1">
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
