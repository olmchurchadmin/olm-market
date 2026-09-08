"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";

const DISMISS_KEY = "cm_site_banner_dismissed";

export function SiteNoticeBannerClient({
  body,
  updatedAt,
}: {
  body: string;
  updatedAt: string;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === updatedAt) {
        setVisible(false);
        return;
      }
    } catch {
      // ignore storage errors
    }
    setVisible(true);
  }, [updatedAt]);

  if (!visible || !body) return null;

  return (
    <aside className="border-b border-black/10 bg-[#ffc83d]">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <p className="min-w-0 flex-1 text-sm leading-snug whitespace-pre-line text-black">
          {body}
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, updatedAt);
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-md p-1 text-black/70 hover:bg-black/10 hover:text-black"
          aria-label={t.admin.bannerDismiss}
        >
          <XMarkIcon className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
