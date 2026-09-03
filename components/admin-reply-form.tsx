"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { replyComplaintAction } from "@/lib/actions/complaints";

export function AdminReplyForm({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft"
      >
        <PaperAirplaneIcon className="size-4" aria-hidden />
        {t.account.complaintReplyCta}
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-2"
      action={async (formData: FormData) => {
        setPending(true);
        try {
          await replyComplaintAction(formData);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="complaint_id" value={complaintId} />
      <textarea
        name="reply"
        required
        rows={3}
        placeholder={t.account.complaintReplyPlaceholder}
        className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
        >
          <PaperAirplaneIcon className="size-4" aria-hidden />
          {pending ? t.common.loading : t.account.complaintReplySubmit}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-brand/15 bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-neutral-100"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
