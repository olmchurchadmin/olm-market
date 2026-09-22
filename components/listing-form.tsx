"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  MAX_IMAGE_OUTPUT_BYTES,
  MAX_IMAGES_TOTAL_BYTES,
} from "@/lib/image-compress";
import type { SaveListingResult } from "@/lib/actions/listings";

const ListingFormBusyContext = createContext(false);

export function useListingFormBusy() {
  return useContext(ListingFormBusyContext);
}

export function ListingForm({
  action,
  initialError,
  photoTotalTooLarge,
  photoStillTooLarge,
  children,
  className = "mt-8 space-y-5",
}: {
  action: (formData: FormData) => Promise<SaveListingResult>;
  initialError?: string | null;
  photoTotalTooLarge: string;
  photoStillTooLarge: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  return (
    <ListingFormBusyContext.Provider value={pending}>
      <form
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = form.querySelector(
            'input[name="images"]',
          ) as HTMLInputElement | null;
          const files = input?.files ? Array.from(input.files) : [];

          if (files.length) {
            const total = files.reduce((sum, file) => sum + file.size, 0);
            if (total > MAX_IMAGES_TOTAL_BYTES) {
              setError(photoTotalTooLarge);
              return;
            }
            if (files.some((file) => file.size > MAX_IMAGE_OUTPUT_BYTES * 2)) {
              setError(photoStillTooLarge);
              return;
            }
          }

          setError(null);
          const formData = new FormData(form);
          startTransition(async () => {
            const result = await action(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            // Navigate as soon as the listing row is saved; images finish in background.
            router.push(result.href);
            router.refresh();
          });
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
    </ListingFormBusyContext.Provider>
  );
}
