"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { deleteNotificationsAction } from "@/lib/actions/notifications";

/**
 * Standalone delete button for the full notifications page. Does not depend on
 * the notifications provider (which only tracks TRADE_TYPES), so it works for
 * any notification type including listing_created.
 */
export function DeleteNotificationButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        setHidden(true); // optimistic
        const result = await deleteNotificationsAction([id]);
        if (!result.ok) {
          setHidden(false);
        }
        setPending(false);
        router.refresh();
      }}
      className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={t.alerts.deleteAria}
    >
      <TrashIcon className="size-4" aria-hidden />
    </button>
  );
}
