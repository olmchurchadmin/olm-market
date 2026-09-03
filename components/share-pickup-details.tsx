"use client";

import { MapPinIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { sharePickupDetailsAction } from "@/lib/actions/pickup";

export function SharePickupDetails({
  orderId,
  defaultContact,
  alreadySent,
}: {
  orderId: string;
  defaultContact: string;
  alreadySent: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [contact, setContact] = useState(defaultContact);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="mt-2 text-xs font-medium text-brand">
        {t.account.pickupShareSent}
      </p>
    );
  }

  if (!open) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft"
        >
          <MapPinIcon className="size-4" aria-hidden />
          {alreadySent
            ? t.account.pickupShareAgainCta
            : t.account.pickupShareCta}
        </button>
        <p className="mt-1.5 text-xs text-ink-muted">
          {t.account.pickupShareHint}
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-3 space-y-2 rounded-md border border-brand/15 bg-white p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
          const result = await sharePickupDetailsAction({
            orderId,
            note,
            contact,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSent(true);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block text-xs font-medium text-foreground">
        {t.account.pickupAddressLabel}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          required
          placeholder={t.account.pickupAddressPlaceholder}
          className="mt-1 w-full rounded-md border border-black/10 px-2.5 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-foreground">
        {t.account.pickupContactLabel}
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t.account.pickupContactPlaceholder}
          className="mt-1 w-full rounded-md border border-black/10 px-2.5 py-2 text-sm"
        />
      </label>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
        >
          <PaperAirplaneIcon className="size-4" aria-hidden />
          {pending ? t.common.loading : t.account.pickupShareSubmit}
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
