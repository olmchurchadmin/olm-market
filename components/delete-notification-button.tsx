"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import { useNotifications } from "@/components/notifications-provider";

export function DeleteNotificationButton({ id }: { id: string }) {
  const { t } = useI18n();
  const { deleteNotification, pending } = useNotifications();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => deleteNotification(id)}
      className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={t.alerts.deleteAria}
    >
      <TrashIcon className="size-4" aria-hidden />
    </button>
  );
}
