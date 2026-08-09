"use client";

import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
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

  function choose(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setLocaleAction(next);
      setOpen(false);
      router.refresh();
    });
  }

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[210] w-40 overflow-hidden rounded-lg border border-brand/15 bg-white py-1 shadow-[0_12px_40px_rgba(28,42,31,0.12)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => choose("ko")}
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-brand/5 ${
                locale === "ko" ? "font-semibold text-brand" : "text-foreground"
              }`}
            >
              {t.common.korean}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => choose("en")}
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-brand/5 ${
                locale === "en" ? "font-semibold text-brand" : "text-foreground"
              }`}
            >
              {t.common.english}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.nav.language}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-md p-2 text-brand hover:bg-brand/5 disabled:opacity-60"
      >
        <GlobeAltIcon className="size-6" aria-hidden />
      </button>
      {menu}
    </>
  );
}
