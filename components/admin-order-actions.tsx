"use client";

import { CheckIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import {
  adminMarkDropoffAction,
  adminMarkPickupAction,
} from "@/lib/actions/orders";

export function AdminOrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  if (status === "awaiting_dropoff") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: t.admin.confirmDropoffTitle,
            message: t.admin.confirmDropoffMessage,
            confirmLabel: t.common.confirm,
            cancelLabel: t.common.cancel,
          });
          if (!ok) return;
          setPending(true);
          try {
            await adminMarkDropoffAction(orderId);
            router.refresh();
          } finally {
            setPending(false);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
      >
        <TruckIcon className="size-4" aria-hidden />
        {pending ? t.common.loading : t.admin.confirmDropoffCta}
      </button>
    );
  }

  if (status === "ready_for_pickup") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: t.admin.confirmPickupTitle,
            message: t.admin.confirmPickupMessage,
            confirmLabel: t.admin.complete,
            cancelLabel: t.common.cancel,
          });
          if (!ok) return;
          setPending(true);
          try {
            await adminMarkPickupAction(orderId);
            router.refresh();
          } finally {
            setPending(false);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-sun px-3 py-2 text-xs font-semibold text-[#1c2a1f] hover:bg-[#f0c65d] disabled:opacity-50"
      >
        <CheckIcon className="size-4" aria-hidden />
        {pending ? t.common.loading : t.admin.confirmPickupCta}
      </button>
    );
  }

  return <span className="text-xs text-ink-muted">—</span>;
}
