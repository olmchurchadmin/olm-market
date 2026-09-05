"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { adminDeleteMemberAction } from "@/lib/actions/auth";

export function AdminDeleteMemberButton({
  memberId,
  memberLabel,
  onDeleteStart,
}: {
  memberId: string;
  memberLabel: string;
  onDeleteStart?: (memberId: string) => void;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={adminDeleteMemberAction}
      onSubmit={() => setSubmitting(true)}
    >
      <input type="hidden" name="user_id" value={memberId} />
      <button
        type="button"
        disabled={submitting}
        title={t.admin.deleteMember}
        aria-label={`${t.admin.deleteMember}: ${memberLabel}`}
        onClick={async () => {
          const ok = await confirm({
            title: t.admin.deleteMemberTitle,
            message: t.admin.deleteMemberMessage.replace("{name}", memberLabel),
            confirmLabel: t.admin.deleteMemberConfirm,
            cancelLabel: t.common.cancel,
            tone: "danger",
          });
          if (!ok) return;
          setSubmitting(true);
          onDeleteStart?.(memberId);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <TrashIcon className="size-4" aria-hidden />
      </button>
    </form>
  );
}
