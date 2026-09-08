"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";

const DISMISS_KEY = "cm_site_banner_dismissed_v2";

type DismissRecord = {
  updatedAt: string;
  until: number;
};

function readDismiss(): DismissRecord | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissRecord;
    if (
      typeof parsed?.updatedAt !== "string" ||
      typeof parsed?.until !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function SiteNoticeBannerClient({
  body,
  updatedAt,
  dismissDays,
  bgColor,
  textColor,
}: {
  body: string;
  updatedAt: string;
  dismissDays: number;
  bgColor: string;
  textColor: string;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const record = readDismiss();
    if (
      record &&
      record.updatedAt === updatedAt &&
      Date.now() < record.until
    ) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [updatedAt]);

  if (!visible || !body) return null;

  const days = Math.max(1, Math.min(365, Math.floor(dismissDays || 7)));

  return (
    <aside
      className="border-b border-black/10"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <p className="min-w-0 flex-1 text-sm leading-snug whitespace-pre-line">
          {body}
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              const until = Date.now() + days * 24 * 60 * 60 * 1000;
              localStorage.setItem(
                DISMISS_KEY,
                JSON.stringify({ updatedAt, until } satisfies DismissRecord),
              );
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100"
          aria-label={t.admin.bannerDismiss}
        >
          <XMarkIcon className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
