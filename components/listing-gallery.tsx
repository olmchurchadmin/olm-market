"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/locale-provider";
import { listingImageUrl } from "@/lib/utils";

type GalleryImage = {
  id: string;
  storage_path: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export function ListingGallery({
  title,
  images,
  coverPath,
}: {
  title: string;
  images: GalleryImage[];
  coverPath?: string | null;
}) {
  const { t } = useI18n();
  const urls = (
    images.length
      ? images.map((img) => listingImageUrl(img.storage_path)).filter(Boolean)
      : [listingImageUrl(coverPath)]
  ).filter((url): url is string => Boolean(url));

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const current = urls[active] || urls[0] || null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        setActive((i) => (i - 1 + urls.length) % urls.length);
        setZoom(MIN_ZOOM);
        setOffset({ x: 0, y: 0 });
      }
      if (event.key === "ArrowRight") {
        setActive((i) => (i + 1) % urls.length);
        setZoom(MIN_ZOOM);
        setOffset({ x: 0, y: 0 });
      }
      if (event.key === "+" || event.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
      }
      if (event.key === "-" || event.key === "_") {
        setZoom((z) => {
          const next = Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2)));
          if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
          return next;
        });
      }
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      if (event.deltaY < 0) {
        setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
      } else {
        setZoom((z) => {
          const next = Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2)));
          if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
          return next;
        });
      }
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("wheel", onWheel);
    };
  }, [lightboxOpen, urls.length]);

  function openLightbox(index = active) {
    setActive(index);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
  }

  function zoomOut() {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2)));
      if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function go(delta: number) {
    setActive((i) => (i + delta + urls.length) % urls.length);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-brand/10 bg-white text-ink-muted">
        {t.market.noImage}
      </div>
    );
  }

  const lightbox =
    lightboxOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex flex-col bg-[rgba(12,18,14,0.94)]"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <p className="truncate text-sm font-medium">
                {title}
                {urls.length > 1 ? ` · ${active + 1}/${urls.length}` : ""}
              </p>
              <button
                type="button"
                onClick={closeLightbox}
                className="rounded-md p-2 hover:bg-white/10"
                aria-label={t.market.closeFullscreen}
              >
                <XMarkIcon className="size-6" aria-hidden />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing"
              onPointerDown={(event) => {
                if (zoom <= MIN_ZOOM) return;
                dragRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: offset.x,
                  originY: offset.y,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                setOffset({
                  x: drag.originX + (event.clientX - drag.startX),
                  y: drag.originY + (event.clientY - drag.startY),
                });
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) {
                  dragRef.current = null;
                }
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              onDoubleClick={() => {
                if (zoom > MIN_ZOOM) {
                  setZoom(MIN_ZOOM);
                  setOffset({ x: 0, y: 0 });
                } else {
                  setZoom(2);
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[active]}
                alt={title}
                draggable={false}
                className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                }}
              />

              {urls.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    aria-label={t.market.prevImage}
                  >
                    <ChevronLeftIcon className="size-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    aria-label={t.market.nextImage}
                  >
                    <ChevronRightIcon className="size-6" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>

            <div className="pointer-events-none absolute right-4 bottom-4 z-10 sm:right-6 sm:bottom-6">
              <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-[rgba(20,28,22,0.88)] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  className="rounded-lg p-2.5 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={t.market.zoomOut}
                >
                  <MagnifyingGlassMinusIcon className="size-6" aria-hidden />
                </button>
                <span className="min-w-12 px-1 text-center text-xs font-semibold tracking-wide text-white/90 tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  className="rounded-lg p-2.5 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={t.market.zoomIn}
                >
                  <MagnifyingGlassPlusIcon className="size-6" aria-hidden />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => openLightbox(active)}
        aria-label={t.market.openFullscreen}
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg border border-brand/10 bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </button>
      {urls.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {urls.map((url, index) => {
            const selected = index === active;
            return (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                onDoubleClick={() => openLightbox(index)}
                aria-label={t.sell.photoN.replace("{n}", String(index + 1))}
                aria-pressed={selected}
                className={`relative aspect-square overflow-hidden rounded-md border-2 bg-white transition ${
                  selected
                    ? "border-brand"
                    : "border-brand/10 opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      ) : null}
      {lightbox}
    </div>
  );
}
