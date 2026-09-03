"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { deleteAccountAction } from "@/lib/actions/auth";

export function DeleteAccountButton() {
  const { t } = useI18n();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={deleteAccountAction}
      onSubmit={() => setSubmitting(true)}
    >
      <button
        type="button"
        disabled={submitting}
        onClick={async () => {
          const ok = await confirm({
            title: t.account.deleteAccountTitle,
            message: t.account.deleteAccountWarning,
            confirmLabel: t.account.deleteAccountConfirm,
            cancelLabel: t.common.cancel,
            tone: "danger",
          });
          if (!ok) return;
          setSubmitting(true);
          formRef.current?.requestSubmit();
        }}
        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <TrashIcon className="size-4" aria-hidden />
        {submitting ? t.common.loading : t.account.deleteAccount}
      </button>
    </form>
  );
}
