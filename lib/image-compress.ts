/** Client-side image resize/compress before upload. */

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.82;
const SKIP_UNDER_BYTES = 400_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    img.src = url;
  });
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

export async function compressImageFile(
  file: File,
  options?: {
    maxEdge?: number;
    quality?: number;
  },
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size > 0 && file.size < SKIP_UNDER_BYTES) {
    // Still downscale very large dimensions even if file is modest
  }

  try {
    const img = await loadImage(file);
    const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
    const quality = options?.quality ?? DEFAULT_QUALITY;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));

    if (scale >= 1 && file.size < SKIP_UNDER_BYTES) {
      return file;
    }

    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const preferJpeg =
      file.type === "image/jpeg" ||
      file.type === "image/jpg" ||
      file.type === "image/webp" ||
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      width * height > 1_000_000;

    const mime = preferJpeg ? "image/jpeg" : "image/png";
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) return file;
    if (blob.size >= file.size && scale >= 1) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const ext = mime === "image/jpeg" ? "jpg" : "png";
    return new File([blob], `${base}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function compressImageFiles(files: FileList | File[]) {
  const list = Array.from(files).slice(0, 6);
  return Promise.all(list.map((file) => compressImageFile(file)));
}
