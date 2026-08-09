"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { resolveComplaintAction } from "@/lib/actions/complaints";

export function ResolveComplaintButton({ complaintId }: { complaintId: string }) {
  const confirm = useConfirm();
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
            title: "컴플레인 해결",
            message: "이 문의/컴플레인을 해결 완료로 표시할까요?",
            confirmLabel: "해결됨",
            cancelLabel: "취소",
          });
          if (!ok) return;
          setPending(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-60"
      >
        <CheckCircleIcon className="size-4" aria-hidden />
        {pending ? "처리 중…" : "해결됨 표시"}
      </button>
    </form>
  );
}
