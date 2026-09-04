"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { deleteComplaintAction } from "@/lib/actions/complaints";

export function DeleteComplaintButton({
  complaintId,
  subject,
}: {
  complaintId: string;
  subject: string;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={deleteComplaintAction}
      onSubmit={() => setSubmitting(true)}
    >
      <input type="hidden" name="complaint_id" value={complaintId} />
      <button
        type="button"
        disabled={submitting}
        title={t.admin.deleteComplaint}
        aria-label={`${t.admin.deleteComplaint}: ${subject}`}
        onClick={async () => {
          const ok = await confirm({
            title: t.admin.deleteComplaintTitle,
            message: t.admin.deleteComplaintMessage,
            confirmLabel: t.admin.deleteComplaintConfirm,
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
