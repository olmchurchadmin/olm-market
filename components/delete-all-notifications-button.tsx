"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { deleteAllNotificationsAction } from "@/lib/actions/notifications";
import { useNotifications } from "@/components/notifications-provider";

export function DeleteAllNotificationsButton({
  hasNotifications,
}: {
  hasNotifications: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useI18n();
  const { refresh } = useNotifications();
  const [pending, startTransition] = useTransition();

  if (!hasNotifications) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: t.account.deleteAllNotificationsTitle,
          message: t.account.deleteAllNotificationsMessage,
          confirmLabel: t.account.deleteAllNotificationsCta,
          cancelLabel: t.common.cancel,
          tone: "danger",
        });
        if (!ok) return;
        startTransition(async () => {
          await deleteAllNotificationsAction();
          refresh();
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      <TrashIcon className="size-3.5" aria-hidden />
      {pending ? t.common.loading : t.account.deleteAllNotificationsCta}
    </button>
  );
}
