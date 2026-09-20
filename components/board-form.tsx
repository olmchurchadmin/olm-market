"use client";

import { useEffect, useState, type ReactNode } from "react";

export function BoardForm({
  action,
  initialError,
  children,
  className = "mt-8 space-y-5",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialError?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  return (
    <form action={action} className={className}>
      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {children}
    </form>
  );
}
