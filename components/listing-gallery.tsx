"use client";

import { useState } from "react";
import { listingImageUrl } from "@/lib/utils";

type GalleryImage = {
  id: string;
  storage_path: string;
};

export function ListingGallery({
  title,
  images,
  coverPath,
}: {
  title: string;
  images: GalleryImage[];
  coverPath?: string | null;
}) {
  const urls = (
    images.length
      ? images.map((img) => listingImageUrl(img.storage_path)).filter(Boolean)
      : [listingImageUrl(coverPath)]
  ).filter((url): url is string => Boolean(url));

  const [active, setActive] = useState(0);
  const current = urls[active] || urls[0] || null;

  if (!current) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)] text-ink-muted">
        No image
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>
      {urls.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {urls.map((url, index) => {
            const selected = index === active;
            return (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`사진 ${index + 1}`}
                aria-pressed={selected}
                className={`aspect-square overflow-hidden rounded-md border-2 transition ${
                  selected
                    ? "border-brand"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
