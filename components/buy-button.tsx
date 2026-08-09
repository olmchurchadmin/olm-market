"use client";

import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyListingAction } from "@/lib/actions/orders";

export function BuyButton({
  listingId,
  disabled,
}: {
  listingId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await buyListingAction(listingId);
            if (!result.ok) {
              if (result.error.includes("로그인")) {
                router.push(`/login?next=/market/${listingId}`);
                return;
              }
              setError(result.error);
              return;
            }
            router.push("/account/transactions");
            router.refresh();
          });
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sun px-5 py-3 text-sm font-semibold text-[#1c2a1f] transition hover:bg-[#f0c65d] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <ShoppingBagIcon className="size-5" aria-hidden />
        {pending ? "처리 중…" : "Buy"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
