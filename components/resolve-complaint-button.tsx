"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { resolveComplaintAction } from "@/lib/actions/complaints";

export function ResolveComplaintButton({ complaintId }: { complaintId: string }) {
  const confirm = useConfirm();
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  return (
    <form ref={formRef} action={resolveComplaintAction}>
      <input type="hidden" name="complaint_id" value={complaintId} />
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: t.admin.resolveTitle,
            message: t.admin.resolveMessage,
            confirmLabel: t.admin.resolved,
            cancelLabel: t.common.cancel,
          });
          if (!ok) return;
          setPending(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-sun hover:bg-brand-soft disabled:opacity-60"
      >
        <CheckCircleIcon className="size-4" aria-hidden />
        {pending ? t.common.loading : t.admin.markResolved}
      </button>
    </form>
  );
}
