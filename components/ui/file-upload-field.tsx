"use client";

import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { compressImageFiles } from "@/lib/image-compress";

type Preview = {
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
}: {
  label: string;
  name?: string;
  accept?: string;
  multiple?: boolean;
  hint?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncInput(files: File[]) {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    input.files = dt.files;
  }

  async function onPick(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    try {
      const compressed = await compressImageFiles(fileList);
      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        const next = compressed.map((file, index) => ({
          key: `${file.name}-${file.size}-${index}-${Date.now()}`,
          file,
          url: URL.createObjectURL(file),
        }));
        syncInput(next.map((p) => p.file));
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index: number) {
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== index);
      syncInput(next.map((p) => p.file));
      return next;
    });
  }

  return (
    <div className="block text-sm font-medium">
      <span>{label}</span>
      {hint ? (
        <span className="mt-0.5 block font-normal text-ink-muted">{hint}</span>
      ) : null}

      <label
        htmlFor={id}
        className="mt-2 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-brand/25 bg-white px-4 py-4 transition hover:border-brand/45"
      >
        <PhotoIcon className="size-8 shrink-0 text-brand-soft" aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">
            {busy
              ? "이미지 줄이는 중…"
              : previews.length > 0
                ? `${previews.length}장 선택됨`
                : "사진 선택"}
          </span>
          <span className="block text-xs text-ink-muted">
            JPG, PNG · 최대 6장 · 큰 사진은 자동으로 줄여 올립니다
          </span>
        </span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            void onPick(e.target.files);
          }}
        />
      </label>

      {previews.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {previews.map((preview, index) => (
            <li
              key={preview.key}
              className="relative aspect-square overflow-hidden rounded-md border border-brand/10 bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-1 right-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/75"
                aria-label="사진 제거"
              >
                <XMarkIcon className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
