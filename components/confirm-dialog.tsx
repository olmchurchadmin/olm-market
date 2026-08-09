"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/components/locale-provider";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return confirm;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();
  const descId = useId();

  // Open confirm outside of transitions so the modal is never deferred/stuck.
  const confirm = useCallback<ConfirmFn>((next) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      // Ensure dialog state is not batched into a low-priority transition.
      queueMicrotask(() => setOptions(next));
    });
  }, []);

  function close(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOptions(null);
  }

  useEffect(() => {
    if (!options) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [options]);

  const tone = options?.tone || "default";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(28,42,31,0.45)] p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md animate-rise rounded-xl border border-brand/15 bg-white p-5 shadow-[0_24px_60px_rgba(28,42,31,0.22)]"
          >
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-2xl text-brand"
            >
              {options.title || t.common.confirm}
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-ink-muted">
              {options.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-md border border-brand/15 bg-white px-4 py-2 text-sm font-medium text-brand hover:bg-brand/5"
              >
                {options.cancelLabel || t.common.cancel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
                  tone === "danger"
                    ? "bg-red-700 hover:bg-red-800"
                    : "bg-brand hover:bg-brand-soft"
                }`}
              >
                {options.confirmLabel || t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
