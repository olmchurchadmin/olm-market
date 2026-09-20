"use client";

import { useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";

export function DeleteBoardButton({
  action,
  fields,
  label,
  title,
  message,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: string;
  title: string;
  message: string;
}) {
  const confirm = useConfirm();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        void (async () => {
          const ok = await confirm({
            title,
            message,
            confirmLabel: t.common.confirm,
            cancelLabel: t.common.cancel,
            tone: "danger",
          });
          if (!ok) return;
          const fd = new FormData();
          Object.entries(fields).forEach(([key, value]) => {
            fd.set(key, value);
          });
          startTransition(() => {
            void action(fd);
          });
        })();
      }}
      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? t.common.loading : label}
    </button>
  );
}
