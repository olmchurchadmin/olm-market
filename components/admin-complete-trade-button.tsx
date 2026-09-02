"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { adminCompleteTradeAction } from "@/lib/actions/orders";

export function AdminCompleteTradeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: t.account.completeTradeTitle,
          message: t.account.completeTradeMessage,
          confirmLabel: t.account.completeTradeCta,
          cancelLabel: t.common.cancel,
        });
        if (!ok) return;
        setPending(true);
        try {
          await adminCompleteTradeAction(orderId);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
    >
      <CheckIcon className="size-4" aria-hidden />
      {pending ? t.common.loading : t.account.completeTradeCta}
    </button>
  );
}
