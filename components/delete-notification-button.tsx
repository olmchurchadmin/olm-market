"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { deleteNotificationsAction } from "@/lib/actions/notifications";

/**
 * Trash icon that slides open a Cancel / Confirm pair before actually deleting.
 */
export function DeleteNotificationButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-hidden">
      {/* Slide-in Cancel / Confirm */}
      <div
        className={`flex items-center gap-1.5 transition-all duration-200 ${
          open
            ? "max-w-[10rem] opacity-100"
            : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="whitespace-nowrap text-xs font-medium text-ink-muted hover:text-foreground"
        >
          {t.common.cancel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setHidden(true);
            const result = await deleteNotificationsAction([id]);
            if (!result.ok) {
              setHidden(false);
              setOpen(false);
            }
            setPending(false);
            router.refresh();
          }}
          className="whitespace-nowrap text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {t.common.confirm}
        </button>
      </div>

      {/* Trash icon */}
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(!open)}
        className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        aria-label={t.alerts.deleteAria}
      >
        <TrashIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
