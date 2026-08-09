"use client";

import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { compressImageFiles } from "@/lib/image-compress";
import { listingImageUrl } from "@/lib/utils";

const MAX_IMAGES = 6;

type ExistingImage = {
  id: string;
  storage_path: string;
};

type NewPreview = {
  key: string;
  file: File;
  url: string;
};

export function FileUploadField({
  label,
  name = "images",
  accept = "image/*",
  multiple = true,
  hint,
  existingImages = [],
  removeName = "remove_image_id",
}: {
  label: string;
  name?: string;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  existingImages?: ExistingImage[];
  removeName?: string;
}) {
  const pickId = useId();
  const submitInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const [keptExisting, setKeptExisting] = useState<ExistingImage[]>(existingImages);
  const [previews, setPreviews] = useState<NewPreview[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCount = keptExisting.length + previews.length;
  const slotsLeft = Math.max(0, MAX_IMAGES - totalCount);
  const removedIds = existingImages
    .filter((img) => !keptExisting.some((kept) => kept.id === img.id))
    .map((img) => img.id);

  function syncSubmitInput(files: File[]) {
    filesRef.current = files;
    const input = submitInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    input.files = dt.files;
  }

  async function onPick(fileList: FileList | null) {
    if (!fileList?.length || slotsLeft <= 0) return;
    setBusy(true);
    try {
      const compressed = await compressImageFiles(
        Array.from(fileList).slice(0, slotsLeft),
      );
      const next = [
        ...filesRef.current,
        ...compressed,
      ].slice(0, MAX_IMAGES - keptExisting.length);

      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return next.map((file, index) => ({
          key: `${file.name}-${file.size}-${index}-${Date.now()}`,
          file,
          url: URL.createObjectURL(file),
        }));
      });
      syncSubmitInput(next);
    } finally {
      setBusy(false);
    }
  }

  function removeExisting(imageId: string) {
    setKeptExisting((prev) => prev.filter((img) => img.id !== imageId));
  }

  function removeNew(index: number) {
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== index);
      syncSubmitInput(next.map((p) => p.file));
      return next;
    });
  }

  return (
    <div className="block text-sm font-medium">
      <span>{label}</span>
      {hint ? (
        <span className="mt-0.5 block font-normal text-ink-muted">{hint}</span>
      ) : null}

      {removedIds.map((imageId) => (
        <input key={imageId} type="hidden" name={removeName} value={imageId} />
      ))}

      {/* Visually hidden but not display:none — browsers may skip display:none file inputs */}
      <input
        ref={submitInputRef}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {totalCount > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {keptExisting.map((image) => {
            const src = listingImageUrl(image.storage_path);
            return (
              <li
                key={image.id}
                className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-brand/10 bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]"
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => removeExisting(image.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/75"
                  aria-label="사진 제거"
                >
                  <XMarkIcon className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
          {previews.map((preview, index) => (
            <li
              key={preview.key}
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-brand/10 bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => removeNew(index)}
                className="absolute top-1 right-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/75"
                aria-label="사진 제거"
              >
                <XMarkIcon className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {slotsLeft > 0 ? (
        <label
          htmlFor={pickId}
          className="mt-3 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-brand/25 bg-white px-4 py-4 transition hover:border-brand/45"
        >
          <PhotoIcon className="size-8 shrink-0 text-brand-soft" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {busy
                ? "이미지 줄이는 중…"
                : totalCount > 0
                  ? `사진 추가 (${totalCount}/${MAX_IMAGES})`
                  : "사진 선택"}
            </span>
            <span className="block text-xs text-ink-muted">
              JPG, PNG · 최대 {MAX_IMAGES}장 · 큰 사진은 자동으로 줄여 올립니다
            </span>
          </span>
          <input
            id={pickId}
            type="file"
            accept={accept}
            multiple={multiple}
            className="sr-only"
            onChange={(e) => {
              void onPick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">
          사진은 최대 {MAX_IMAGES}장까지입니다. 더 올리려면 기존 사진을 지워
          주세요.
        </p>
      )}
    </div>
  );
}
