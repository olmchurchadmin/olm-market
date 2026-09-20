/** Client-side image resize/compress before upload. */

export const MAX_IMAGE_INPUT_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_OUTPUT_BYTES = 450_000;
export const MAX_IMAGES_PER_LISTING = 6;
export const MAX_IMAGES_PER_BOARD_POST = 3;
/** Keep total multipart body under Vercel/server-action limits. */
export const MAX_IMAGES_TOTAL_BYTES = 3.5 * 1024 * 1024;

const DEFAULT_MAX_EDGE = 1280;
const FALLBACK_MAX_EDGE = 960;
const SKIP_UNDER_BYTES = 350_000;

export type ImageCompressErrorCode =
  | "not_image"
  | "unsupported_format"
  | "too_large_input"
  | "load_failed"
  | "encode_failed"
  | "still_too_large"
  | "total_too_large"
  | "process_failed";

export class ImageCompressError extends Error {
  code: ImageCompressErrorCode;

  constructor(code: ImageCompressErrorCode) {
    super(code);
    this.name = "ImageCompressError";
    this.code = code;
  }
}

type BitmapSource = ImageBitmap | HTMLImageElement;

function yieldToMain(ms = 0) {
  return new Promise<void>((resolve) => {
    if (ms > 0) {
      setTimeout(() => resolve(), ms);
      return;
    }
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

async function loadBitmap(file: File): Promise<BitmapSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to <img> decode.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageCompressError("load_failed"));
    };
    img.src = url;
  });
}

function releaseBitmap(source: BitmapSource) {
  if ("close" in source && typeof source.close === "function") {
    source.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function clearCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

async function encodeJpeg(
  source: BitmapSource,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    clearCanvas(canvas);
    return null;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  clearCanvas(canvas);
  return blob;
}

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new ImageCompressError("not_image");
  }
  if (
    file.type === "image/gif" ||
    file.type === "image/svg+xml" ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  ) {
    if (file.size > MAX_IMAGE_OUTPUT_BYTES) {
      throw new ImageCompressError("unsupported_format");
    }
    return file;
  }

  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new ImageCompressError("too_large_input");
  }

  let source: BitmapSource | null = null;
  try {
    source = await loadBitmap(file);
    await yieldToMain();

    const alreadySmall =
      Math.max(source.width, source.height) <= DEFAULT_MAX_EDGE &&
      file.size <= SKIP_UNDER_BYTES &&
      (file.type === "image/jpeg" || file.type === "image/webp");
    if (alreadySmall) {
      return file;
    }

    const attempts: Array<{ maxEdge: number; quality: number }> = [
      { maxEdge: DEFAULT_MAX_EDGE, quality: 0.72 },
      { maxEdge: DEFAULT_MAX_EDGE, quality: 0.55 },
      { maxEdge: FALLBACK_MAX_EDGE, quality: 0.48 },
      { maxEdge: FALLBACK_MAX_EDGE, quality: 0.36 },
    ];

    let best: Blob | null = null;
    for (const attempt of attempts) {
      await yieldToMain(16);
      const blob = await encodeJpeg(source, attempt.maxEdge, attempt.quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= MAX_IMAGE_OUTPUT_BYTES) {
        best = blob;
        break;
      }
    }

    if (!best) {
      throw new ImageCompressError("encode_failed");
    }
    if (best.size > MAX_IMAGE_OUTPUT_BYTES) {
      throw new ImageCompressError("still_too_large");
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([best], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    if (error instanceof ImageCompressError) throw error;
    throw new ImageCompressError("process_failed");
  } finally {
    if (source) releaseBitmap(source);
  }
}

export async function compressImageFiles(files: FileList | File[]) {
  const list = Array.from(files).slice(0, MAX_IMAGES_PER_LISTING);
  const out: File[] = [];
  for (const file of list) {
    out.push(await compressImageFile(file));
    // Give the browser a beat between heavy decodes (esp. mobile Safari).
    await yieldToMain(32);
  }

  const total = out.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_IMAGES_TOTAL_BYTES) {
    throw new ImageCompressError("total_too_large");
  }

  return out;
}
