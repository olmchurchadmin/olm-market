"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 20;

/** Refresh the listing page while background photo uploads finish. */
export function ListingPhotosPendingPoller({
  enabled,
  hasImages,
}: {
  enabled: boolean;
  hasImages: boolean;
}) {
  const router = useRouter();
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!enabled || hasImages) return;

    attemptsRef.current = 0;
    const timer = setInterval(() => {
      attemptsRef.current += 1;
      router.refresh();
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(timer);
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [enabled, hasImages, router]);

  return null;
}
