"use client";

import { CheckIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const [pending, startTransition] = useTransition();

  if (status === "awaiting_dropoff") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await adminMarkDropoffAction(orderId);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
      >
        <TruckIcon className="size-4" aria-hidden />
        드롭오프 확인
      </button>
    );
  }

  if (status === "ready_for_pickup") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await adminMarkPickupAction(orderId);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md bg-sun px-3 py-2 text-xs font-semibold text-[#1c2a1f] hover:bg-[#f0c65d] disabled:opacity-50"
      >
        <CheckIcon className="size-4" aria-hidden />
        픽업·현금수령 완료
      </button>
    );
  }

  return <span className="text-xs text-ink-muted">—</span>;
}
