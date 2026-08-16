"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminTestSmsAction } from "@/lib/actions/admin-sms";

export function AdminSmsTest({
  hasPhone,
  labels,
}: {
  hasPhone: boolean;
  labels: {
    title: string;
    blurb: string;
    cta: string;
    noPhone: string;
    working: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-brand/10 bg-white/70 p-4">
      <h3 className="font-semibold text-foreground">{labels.title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{labels.blurb}</p>
      {!hasPhone ? (
        <p className="mt-3 text-sm text-amber-800">{labels.noPhone}</p>
      ) : (
        <button
          type="button"
          disabled={pending}
          className="btn-primary mt-3"
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await adminTestSmsAction();
              setMessage(result.ok ? result.message : result.error);
              router.refresh();
            });
          }}
        >
          {pending ? labels.working : labels.cta}
        </button>
      )}
      {message ? (
        <p className="mt-3 whitespace-pre-wrap break-all text-sm text-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
