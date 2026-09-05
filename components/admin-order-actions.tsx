"use client";

import { CheckIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import {
  adminCompleteTradeAction,
  adminMarkDropoffAction,
  adminMarkPickupAction,
} from "@/lib/actions/orders";

export function AdminOrderActions({
  orderId,
  status,
  homePickup,
}: {
  orderId: string;
  status: string;
  homePickup?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  async function run(
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
    prompt: { title: string; message: string; confirmLabel: string },
  ) {
    const ok = await confirm({
      title: prompt.title,
      message: prompt.message,
      confirmLabel: prompt.confirmLabel,
      cancelLabel: t.common.cancel,
    });
    if (!ok) return;
    startTransition(async () => {
      await action(orderId);
      router.refresh();
    });
  }

  // Home pickup never passes through church, so the only step is confirming
  // both sides finished.
  if (homePickup && status !== "completed") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(adminCompleteTradeAction, {
            title: t.admin.completeTradeTitle,
            message: t.admin.completeTradeMessage,
            confirmLabel: t.admin.complete,
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
      >
        <CheckIcon className="size-4" aria-hidden />
        {pending ? t.common.loading : t.admin.completeTradeCta}
      </button>
    );
  }

  if (status === "awaiting_dropoff") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(adminMarkDropoffAction, {
            title: t.admin.confirmDropoffTitle,
            message: t.admin.confirmDropoffMessage,
            confirmLabel: t.common.confirm,
          })
        }
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
        onClick={() =>
          run(adminMarkPickupAction, {
            title: t.admin.confirmPickupTitle,
            message: t.admin.confirmPickupMessage,
            confirmLabel: t.admin.complete,
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md border border-brand/20 bg-sun px-3 py-2 text-xs font-semibold text-brand hover:brightness-[0.97] disabled:opacity-50"
      >
        <CheckIcon className="size-4" aria-hidden />
        {pending ? t.common.loading : t.admin.confirmPickupCta}
      </button>
    );
  }

  return <span className="text-xs text-ink-muted">—</span>;
}
