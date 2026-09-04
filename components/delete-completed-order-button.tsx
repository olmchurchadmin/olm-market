"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { adminDeleteCompletedOrderAction } from "@/lib/actions/orders";

export function DeleteCompletedOrderButton({
  orderId,
  title,
}: {
  orderId: string;
  title: string;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={adminDeleteCompletedOrderAction}
      onSubmit={() => setSubmitting(true)}
    >
      <input type="hidden" name="order_id" value={orderId} />
      <button
        type="button"
        disabled={submitting}
        title={t.admin.deleteCompletedOrder}
        aria-label={`${t.admin.deleteCompletedOrder}: ${title}`}
        onClick={async () => {
          const ok = await confirm({
            title: t.admin.deleteCompletedOrderTitle,
            message: t.admin.deleteCompletedOrderMessage.replace(
              "{title}",
              title,
            ),
            confirmLabel: t.admin.deleteCompletedOrderConfirm,
            cancelLabel: t.common.cancel,
            tone: "danger",
          });
          if (!ok) return;
          setSubmitting(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <TrashIcon className="size-4" aria-hidden />
      </button>
    </form>
  );
}
