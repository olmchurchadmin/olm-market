"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteListingAction } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId }: { listingId: string }) {
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
            title: "물품 삭제",
            message: "이 물품을 삭제할까요? 삭제 후 되돌릴 수 없습니다.",
            confirmLabel: "삭제",
            cancelLabel: "취소",
            tone: "danger",
          });
          if (!ok) return;
          setSubmitting(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <TrashIcon className="size-3.5" aria-hidden />
        {submitting ? "삭제 중…" : "삭제"}
      </button>
    </form>
  );
}
