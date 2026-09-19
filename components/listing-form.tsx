"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  MAX_IMAGE_OUTPUT_BYTES,
  MAX_IMAGES_TOTAL_BYTES,
} from "@/lib/image-compress";

export function ListingForm({
  action,
  initialError,
  photoTotalTooLarge,
  photoStillTooLarge,
  children,
  className = "mt-8 space-y-5",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialError?: string | null;
  photoTotalTooLarge: string;
  photoStillTooLarge: string;
  children: ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        const form = event.currentTarget;
        const input = form.querySelector(
          'input[name="images"]',
        ) as HTMLInputElement | null;
        const files = input?.files ? Array.from(input.files) : [];
        if (!files.length) {
          setError(null);
          return;
        }

        const total = files.reduce((sum, file) => sum + file.size, 0);
        if (total > MAX_IMAGES_TOTAL_BYTES) {
          event.preventDefault();
          setError(photoTotalTooLarge);
          return;
        }

        if (files.some((file) => file.size > MAX_IMAGE_OUTPUT_BYTES * 2)) {
          event.preventDefault();
          setError(photoStillTooLarge);
          return;
        }

        setError(null);
      }}
    >
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
