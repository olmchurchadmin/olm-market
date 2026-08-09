"use client";

import { PhotoIcon } from "@heroicons/react/24/outline";
import { useId, useState } from "react";

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
  const [count, setCount] = useState(0);

  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}
      {hint ? <span className="mt-0.5 block font-normal text-ink-muted">{hint}</span> : null}
      <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-brand/25 bg-white px-4 py-4 transition hover:border-brand/45">
        <PhotoIcon className="size-8 shrink-0 text-brand-soft" aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">
            {count > 0 ? `${count}개 선택됨` : "사진 선택"}
          </span>
          <span className="block text-xs text-ink-muted">
            JPG, PNG · 최대 6장
          </span>
        </span>
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => setCount(e.target.files?.length ?? 0)}
        />
      </span>
    </label>
  );
}
