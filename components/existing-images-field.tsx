"use client";

import { useState } from "react";
import { listingImageUrl } from "@/lib/utils";

type ImageRow = {
  id: string;
  storage_path: string;
};

export function ExistingImagesField({ images }: { images: ImageRow[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  if (!images.length) return null;

  return (
    <div>
      <p className="text-sm font-medium">현재 사진</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        제거하려면 사진을 클릭하세요. 새 사진은 아래에서 추가할 수 있습니다.
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {images.map((image) => {
          const removed = Boolean(hidden[image.id]);
          const src = listingImageUrl(image.storage_path);
          return (
            <li key={image.id} className="relative">
              {removed ? (
                <input type="hidden" name="remove_image_id" value={image.id} />
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setHidden((prev) => ({
                    ...prev,
                    [image.id]: !prev[image.id],
                  }))
                }
                className={`relative aspect-square w-full overflow-hidden rounded-md border ${
                  removed
                    ? "border-red-300 opacity-40"
                    : "border-brand/10"
                } bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-medium text-white">
                  {removed ? "제거됨" : "클릭하여 제거"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
