"use client";

import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  deleteSiteBannerAction,
  saveSiteBannerAction,
} from "@/lib/actions/site-banner";
import {
  getBannerStatus,
  SITE_BANNER_DEFAULT_BG,
  SITE_BANNER_DEFAULT_TEXT,
  type BannerStatusKey,
} from "@/lib/site-banner";
import type { SiteBanner } from "@/lib/types";

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplayDate(yyyyMmDd: string, locale: string) {
  if (!yyyyMmDd) return "";
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function statusTone(status: BannerStatusKey) {
  switch (status) {
    case "live":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "scheduled":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "expired":
      return "bg-black/5 text-ink-muted ring-black/10";
    default:
      return "bg-black/5 text-ink-muted ring-black/10";
  }
}

function BannerEditorForm({
  banner,
  onCancel,
  onSaved,
}: {
  banner: SiteBanner | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const [startsOn, setStartsOn] = useState(toDateInputValue(banner?.starts_at));
  const [endsOn, setEndsOn] = useState(toDateInputValue(banner?.ends_at));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const scheduleSummary = useMemo(() => {
    if (!startsOn && !endsOn) return t.admin.bannerScheduleAlways;
    if (startsOn && !endsOn) {
      return t.admin.bannerScheduleFrom.replace(
        "{start}",
        formatDisplayDate(startsOn, locale),
      );
    }
    if (!startsOn && endsOn) {
      return t.admin.bannerScheduleUntil.replace(
        "{end}",
        formatDisplayDate(endsOn, locale),
      );
    }
    return t.admin.bannerScheduleRange
      .replace("{start}", formatDisplayDate(startsOn, locale))
      .replace("{end}", formatDisplayDate(endsOn, locale));
  }, [startsOn, endsOn, locale, t.admin]);

  function applyPreset(kind: "always" | "today" | "week" | "month") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (kind === "always") {
      setStartsOn("");
      setEndsOn("");
      return;
    }
    if (kind === "today") {
      const ymd = toYmd(today);
      setStartsOn(ymd);
      setEndsOn(ymd);
      return;
    }
    if (kind === "week") {
      setStartsOn(toYmd(today));
      setEndsOn(toYmd(addDays(today, 6)));
      return;
    }
    setStartsOn(toYmd(today));
    setEndsOn(toYmd(addDays(today, 29)));
  }

  return (
    <form
      className="mt-5 space-y-5 rounded-lg border border-brand/10 bg-white/70 p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await saveSiteBannerAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onSaved();
        });
      }}
    >
      {banner ? (
        <input type="hidden" name="banner_id" value={banner.id} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {banner ? t.admin.bannerEditTitle : t.admin.bannerNewTitle}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-muted hover:text-brand hover:underline"
        >
          {t.common.cancel}
        </button>
      </div>

      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={banner ? Boolean(banner.enabled) : true}
          className="size-4 accent-[var(--brand)]"
        />
        {t.admin.bannerEnabled}
      </label>

      <label className="block space-y-1.5 text-sm font-medium">
        {t.admin.bannerBodyKo}
        <textarea
          name="body_ko"
          rows={3}
          defaultValue={banner?.body_ko || ""}
          className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
        />
        <span className="block text-xs font-normal text-ink-muted">
          {t.admin.bannerBodyHint}
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          {t.admin.bannerScheduleLabel}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["always", t.admin.bannerPresetAlways],
              ["today", t.admin.bannerPresetToday],
              ["week", t.admin.bannerPresetWeek],
              ["month", t.admin.bannerPresetMonth],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              onClick={() => applyPreset(kind)}
              className="rounded-md border border-brand/15 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-brand/5"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePickerField
            label={t.admin.bannerStartsAt}
            name="starts_on"
            value={startsOn}
            onChange={setStartsOn}
          />
          <DatePickerField
            label={t.admin.bannerEndsAt}
            name="ends_on"
            value={endsOn}
            onChange={setEndsOn}
          />
        </div>
        <p className="rounded-md bg-brand/5 px-3 py-2 text-xs text-foreground">
          {scheduleSummary}
        </p>
        <p className="text-xs text-ink-muted">{t.admin.bannerScheduleHint}</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span>{t.admin.bannerDismissDays}</span>
          <input
            name="dismiss_days"
            type="number"
            min={1}
            max={365}
            defaultValue={
              typeof banner?.dismiss_days === "number" ? banner.dismiss_days : 7
            }
            className="w-full max-w-[12rem] rounded-md border border-brand/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand"
          />
          <span className="text-xs font-normal text-ink-muted">
            {t.admin.bannerDismissDaysHint}
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span>{t.admin.bannerBgColor}</span>
            <div className="flex items-center gap-2">
              <input
                name="bg_color"
                type="color"
                defaultValue={banner?.bg_color?.trim() || SITE_BANNER_DEFAULT_BG}
                className="h-10 w-14 rounded-md border border-brand/15 bg-white p-1"
              />
              <span className="text-xs font-normal text-ink-muted">
                {t.admin.bannerColorHint}
              </span>
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span>{t.admin.bannerTextColor}</span>
            <div className="flex items-center gap-2">
              <input
                name="text_color"
                type="color"
                defaultValue={banner?.text_color?.trim() || SITE_BANNER_DEFAULT_TEXT}
                className="h-10 w-14 rounded-md border border-brand/15 bg-white p-1"
              />
              <span className="text-xs font-normal text-ink-muted">
                {t.admin.bannerColorHint}
              </span>
            </div>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? t.common.loading : t.admin.bannerSave}
      </button>
    </form>
  );
}

function DeleteBannerIconButton({ bannerId }: { bannerId: number }) {
  const confirm = useConfirm();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={t.admin.bannerDelete}
      title={t.admin.bannerDelete}
      onClick={() => {
        void (async () => {
          const ok = await confirm({
            title: t.admin.bannerDeleteTitle,
            message: t.admin.bannerDeleteMessage,
            confirmLabel: t.common.confirm,
            cancelLabel: t.common.cancel,
            tone: "danger",
          });
          if (!ok) return;
          const fd = new FormData();
          fd.set("banner_id", String(bannerId));
          startTransition(() => {
            void deleteSiteBannerAction(fd);
          });
        })();
      }}
      className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
    >
      <TrashIcon className="size-4" aria-hidden />
    </button>
  );
}

export function AdminBannerPanel({ banners }: { banners: SiteBanner[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const editing =
    mode === "edit" && editingId != null
      ? banners.find((item) => item.id === editingId) ?? null
      : null;

  const sorted = useMemo(() => {
    return [...banners].sort((a, b) => {
      // Latest schedule end date first; open-ended (no ends_at) stays on top.
      const aEnd = a.ends_at ? new Date(a.ends_at).getTime() : Number.POSITIVE_INFINITY;
      const bEnd = b.ends_at ? new Date(b.ends_at).getTime() : Number.POSITIVE_INFINITY;
      if (bEnd !== aEnd) return bEnd - aEnd;
      const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      if (bStart !== aStart) return bStart - aStart;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [banners]);

  const statusLabel = (status: BannerStatusKey) => {
    switch (status) {
      case "live":
        return t.admin.bannerStatusLiveShort;
      case "scheduled":
        return t.admin.bannerStatusScheduledShort;
      case "expired":
        return t.admin.bannerStatusExpiredShort;
      default:
        return t.admin.bannerStatusOffShort;
    }
  };

  const scheduleLabel = (banner: SiteBanner) => {
    const startsOn = toDateInputValue(banner.starts_at);
    const endsOn = toDateInputValue(banner.ends_at);
    if (!startsOn && !endsOn) return t.admin.bannerScheduleAlways;
    if (startsOn && !endsOn) {
      return t.admin.bannerScheduleFrom.replace(
        "{start}",
        formatDisplayDate(startsOn, locale),
      );
    }
    if (!startsOn && endsOn) {
      return t.admin.bannerScheduleUntil.replace(
        "{end}",
        formatDisplayDate(endsOn, locale),
      );
    }
    return t.admin.bannerScheduleRange
      .replace("{start}", formatDisplayDate(startsOn, locale))
      .replace("{end}", formatDisplayDate(endsOn, locale));
  };

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
            {t.admin.bannerTab}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t.admin.bannerBlurb}</p>
        </div>
        {mode === "list" ? (
          <button
            type="button"
            onClick={() => {
              setFlash(null);
              setEditingId(null);
              setMode("create");
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-soft"
          >
            <PlusIcon className="size-4" aria-hidden />
            {t.admin.bannerNew}
          </button>
        ) : null}
      </div>

      {flash ? (
        <p className="mt-4 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {flash}
        </p>
      ) : null}

      {mode === "list" ? (
        sorted.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">{t.admin.bannerEmpty}</p>
        ) : (
          <ul className="mt-6 divide-y divide-black/6 overflow-hidden rounded-md border border-black/6 bg-white">
            {sorted.map((banner) => {
              const status = getBannerStatus(banner);
              const preview =
                banner.body_ko.trim() ||
                banner.body_en.trim() ||
                t.admin.bannerBodyEmpty;
              return (
                <li
                  key={banner.id}
                  className="flex items-start gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusTone(status)}`}
                      >
                        {statusLabel(status)}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {scheduleLabel(banner)}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm text-foreground">
                      {preview}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={t.admin.bannerEdit}
                      title={t.admin.bannerEdit}
                      onClick={() => {
                        setEditingId(banner.id);
                        setMode("edit");
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-brand/5 hover:text-brand"
                    >
                      <PencilSquareIcon className="size-4" aria-hidden />
                    </button>
                    <DeleteBannerIconButton bannerId={banner.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <BannerEditorForm
          key={editing?.id ?? "new"}
          banner={mode === "edit" ? editing : null}
          onCancel={() => {
            setEditingId(null);
            setMode("list");
          }}
          onSaved={() => {
            setEditingId(null);
            setMode("list");
            setFlash(t.admin.bannerSavedFlash);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
