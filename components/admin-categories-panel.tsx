"use client";

import { Bars3Icon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/lib/actions/categories";
import type { Category } from "@/lib/types";

type CategoryRow = Category & { name_en?: string | null };

export function AdminCategoriesPanel({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const { locale, t } = useI18n();
  const confirm = useConfirm();
  const [items, setItems] = useState(categories);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const orderFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const orderedIds = useMemo(() => items.map((item) => item.id), [items]);
  const orderDirty = useMemo(() => {
    if (items.length !== categories.length) return true;
    return items.some((item, index) => item.id !== categories[index]?.id);
  }, [categories, items]);

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setItems((prev) => {
      const next = [...prev];
      const from = next.findIndex((item) => item.id === dragId);
      const to = next.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  }

  return (
    <section className="mt-8">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
        {t.admin.categoriesTab}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{t.admin.categoriesBlurb}</p>

      <form
        action={createCategoryAction}
        className="mt-5 grid gap-3 rounded-lg border border-brand/10 bg-white/70 p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
            {t.admin.categoryNameKo}
          </span>
          <input
            name="name_ko"
            required
            maxLength={40}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
            {t.admin.categoryNameEn}
          </span>
          <input
            name="name_en"
            maxLength={40}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft sm:w-auto"
          >
            <PlusIcon className="size-4" aria-hidden />
            {t.admin.categoryAdd}
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{t.admin.categoryDragHint}</p>
        <form ref={orderFormRef} action={reorderCategoriesAction}>
          <input
            type="hidden"
            name="ordered_ids"
            value={JSON.stringify(orderedIds)}
          />
          <button
            type="submit"
            disabled={!orderDirty || pending}
            className="rounded-md border border-brand/15 bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand/5 disabled:opacity-50"
          >
            {pending ? t.common.loading : t.admin.categorySaveOrder}
          </button>
        </form>
      </div>

      <ul className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(item.id)}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-lg border border-brand/10 bg-white/70 px-3 py-2.5 ${
                dragId === item.id ? "opacity-60" : ""
              }`}
            >
              <span className="cursor-grab text-ink-muted active:cursor-grabbing">
                <Bars3Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {locale === "en"
                    ? item.name_en || item.name_ko
                    : item.name_ko}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {item.name_ko}
                  {item.name_en ? ` · ${item.name_en}` : ""} · {item.slug}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50"
                title={t.admin.categoryDeleteTitle}
                aria-label={`${t.admin.categoryDeleteTitle}: ${item.name_ko}`}
                onClick={() => {
                  startTransition(async () => {
                    const ok = await confirm({
                      title: t.admin.categoryDeleteTitle,
                      message: t.admin.categoryDeleteMessage.replace(
                        "{name}",
                        item.name_ko,
                      ),
                      confirmLabel: t.admin.categoryDeleteConfirm,
                      cancelLabel: t.common.cancel,
                      tone: "danger",
                    });
                    if (!ok) return;
                    const fd = new FormData();
                    fd.set("category_id", item.id);
                    await deleteCategoryAction(fd);
                  });
                }}
              >
                <TrashIcon className="size-4" aria-hidden />
              </button>
            </li>
          ))
        ) : (
          <li className="text-sm text-ink-muted">{t.admin.categoryEmpty}</li>
        )}
      </ul>
    </section>
  );
}
