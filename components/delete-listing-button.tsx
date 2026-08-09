"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { deleteListingAction } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={deleteListingAction}
      onSubmit={() => setSubmitting(true)}
    >
      <input type="hidden" name="listing_id" value={listingId} />
      <button
        type="button"
        disabled={submitting}
        onClick={async () => {
          const ok = await confirm({
            title: t.sell.deleteTitle,
            message: t.sell.deleteMessage,
            confirmLabel: t.account.delete,
            cancelLabel: t.common.cancel,
            tone: "danger",
          });
          if (!ok) return;
          setSubmitting(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <TrashIcon className="size-3.5" aria-hidden />
        {submitting ? t.common.loading : t.account.delete}
      </button>
    </form>
  );
}
