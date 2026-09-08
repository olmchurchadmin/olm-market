"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled) || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={
        className ||
        "rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-soft disabled:cursor-wait disabled:opacity-70"
      }
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
