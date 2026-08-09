"use client";

import {
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BuildingStorefrontIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/user-menu";
import { signOutAction } from "@/lib/actions/auth";

type SiteNavProps = {
  profile: {
    displayName: string;
    email: string | null;
    isAdmin: boolean;
  } | null;
};

export function SiteNav({ profile }: SiteNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-1 text-sm font-medium text-foreground md:flex md:gap-2">
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
            displayName={profile.displayName}
            email={profile.email}
            isAdmin={profile.isAdmin}
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

      {/* Mobile hamburger */}
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 text-brand hover:bg-brand/5 md:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        <Bars3Icon className="size-6" aria-hidden />
        <span className="sr-only">메뉴 열기</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] md:hidden" id="mobile-nav">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-[rgba(28,42,31,0.4)] backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col bg-white shadow-[-12px_0_40px_rgba(28,42,31,0.16)]">
            <div className="flex items-center justify-between border-b border-brand/10 px-4 py-3">
              <p className="font-[family-name:var(--font-display)] text-lg text-brand">
                Menu
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-brand hover:bg-brand/5"
              >
                <XMarkIcon className="size-6" aria-hidden />
                <span className="sr-only">닫기</span>
              </button>
            </div>

            {profile ? (
              <div className="border-b border-brand/10 px-4 py-3">
                <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
                  Signed in as
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-brand">
                  {profile.displayName}
                </p>
                {profile.email && profile.email !== profile.displayName ? (
                  <p className="truncate text-xs text-ink-muted">
                    {profile.email}
                  </p>
                ) : null}
              </div>
            ) : null}

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm font-medium">
              <Link
                href="/market"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-3 hover:bg-brand/5 hover:text-brand"
              >
                <BuildingStorefrontIcon className="size-5" aria-hidden />
                장터
              </Link>
              <Link
                href="/sell"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-3 hover:bg-brand/5 hover:text-brand"
              >
                <PlusCircleIcon className="size-5" aria-hidden />
                판매등록
              </Link>
              {profile ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-3 hover:bg-brand/5 hover:text-brand"
                  >
                    <UserCircleIcon className="size-5" aria-hidden />
                    My Account
                  </Link>
                  {profile.isAdmin ? (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-3 hover:bg-brand/5 hover:text-brand"
                    >
                      <ShieldCheckIcon className="size-5" aria-hidden />
                      관리자
                    </Link>
                  ) : null}
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-3 text-white hover:bg-brand-soft"
                >
                  <ArrowRightOnRectangleIcon className="size-5" aria-hidden />
                  로그인
                </Link>
              )}
            </nav>
            {profile ? (
              <form action={signOutAction} className="border-t border-brand/10 p-3">
                <button
                  type="submit"
                  className="inline-flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm text-ink-muted hover:bg-brand/5 hover:text-brand"
                >
                  <ArrowLeftOnRectangleIcon className="size-5" aria-hidden />
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
