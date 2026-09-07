"use client";

import { CheckIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import {
  confirmDropoffAction,
  confirmPickupAction,
} from "@/lib/actions/orders";

export function OrderTradeConfirmButton({
  orderId,
  action,
}: {
  orderId: string;
  action: "dropoff" | "pickup";
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  const isDropoff = action === "dropoff";
  const prompt = isDropoff
    ? {
        title: t.account.confirmDropoffTitle,
        message: t.account.confirmDropoffMessage,
        confirmLabel: t.account.confirmDropoffCta,
        label: t.account.confirmDropoffCta,
      }
    : {
        title: t.account.confirmPickupTitle,
        message: t.account.confirmPickupMessage,
        confirmLabel: t.account.confirmPickupCta,
        label: t.account.confirmPickupCta,
      };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: prompt.title,
          message: prompt.message,
          confirmLabel: prompt.confirmLabel,
          cancelLabel: t.common.cancel,
        });
        if (!ok) return;
        startTransition(async () => {
          if (isDropoff) {
            await confirmDropoffAction(orderId);
          } else {
            await confirmPickupAction(orderId);
          }
          router.refresh();
        });
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        isDropoff
          ? "border-brand/20 bg-white text-foreground hover:bg-brand/5"
          : "border-brand/20 bg-brand text-white hover:bg-brand-soft"
      }`}
    >
      {isDropoff ? (
        <TruckIcon className="size-3.5" aria-hidden />
      ) : (
        <CheckIcon className="size-3.5" aria-hidden />
      )}
      {pending ? t.common.loading : prompt.label}
    </button>
  );
}
