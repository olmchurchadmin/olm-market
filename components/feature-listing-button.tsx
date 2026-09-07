"use client";

import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/locale-provider";
import { toggleListingFeaturedAction } from "@/lib/actions/listings";

export function FeatureListingButton({
  listingId,
  featured,
}: {
  listingId: string;
  featured: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isFeatured, setIsFeatured] = useState(featured);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !isFeatured;
        setIsFeatured(next);
        startTransition(async () => {
          const fd = new FormData();
          fd.set("listing_id", listingId);
          try {
            await toggleListingFeaturedAction(fd);
            router.refresh();
          } catch {
            setIsFeatured(!next);
          }
        });
      }}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
        isFeatured
          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : "border-brand/15 bg-white text-foreground hover:bg-brand/5"
      }`}
    >
      {isFeatured ? (
        <StarSolid className="size-3.5 text-amber-500" aria-hidden />
      ) : (
        <StarOutline className="size-3.5" aria-hidden />
      )}
      {pending
        ? t.common.loading
        : isFeatured
          ? t.admin.unfeatureListing
          : t.admin.featureListing}
    </button>
  );
}
