"use client";

import {
  ArrowLeftOnRectangleIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { signOutAction } from "@/lib/actions/auth";

type UserMenuProps = {
  displayName: string;
  email: string | null;
  isAdmin: boolean;
};

export function UserMenu({ displayName, email, isAdmin }: UserMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-foreground hover:bg-brand/5 hover:text-brand"
      >
        <UserCircleIcon className="size-6" aria-hidden />
        <ChevronDownIcon
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        <span className="sr-only">{t.nav.myAccount}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-brand/15 bg-white shadow-[0_12px_40px_rgba(28,42,31,0.12)]"
        >
          <div className="border-b border-brand/10 px-3 py-3">
            <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
              {t.nav.signedInAs}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            {email && email !== displayName ? (
              <p className="truncate text-xs text-ink-muted">{email}</p>
            ) : null}
          </div>
          <div className="p-1.5">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-brand/5 hover:text-brand"
            >
              <UserCircleIcon className="size-4" aria-hidden />
              {t.nav.myAccount}
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-brand/5 hover:text-brand"
              >
                <ShieldCheckIcon className="size-4" aria-hidden />
                {t.nav.admin}
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink-muted hover:bg-brand/5 hover:text-brand"
              >
                <ArrowLeftOnRectangleIcon className="size-4" aria-hidden />
                {t.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
