"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { useNotifications } from "@/components/notifications-provider";

/** Lets the full notifications page clear the bell without leaving the page. */
export function MarkAllReadButton() {
  const router = useRouter();
  const { t } = useI18n();
  const { unreadCount, markAllRead, pending, markFailed } = useNotifications();

  if (!unreadCount) return null;

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          markAllRead();
          router.refresh();
        }}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
      >
        {pending ? t.common.loading : t.account.markAllReadCta}
      </button>
      {markFailed ? (
        <p className="mt-1.5 text-xs text-red-700">{t.alerts.markFailed}</p>
      ) : null}
    </div>
  );
}
