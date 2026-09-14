"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, ko as koLocale } from "date-fns/locale";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/components/locale-provider";

function toYmd(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function DatePickerField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const { t, locale } = useI18n();
  const dateFnsLocale = locale === "en" ? enUS : koLocale;
  const selected = parseYmd(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(
    () => selected || new Date(),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (selected) setMonth(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekdays = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(base);
      day.setDate(base.getDate() + i);
      return format(day, "EEEEEE", { locale: dateFnsLocale });
    });
  }, [dateFnsLocale]);

  const display = selected
    ? format(selected, locale === "en" ? "MMM d, yyyy" : "yyyy. M. d.", {
        locale: dateFnsLocale,
      })
    : t.common.pickDate;

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-brand/15 bg-white px-3 py-2 text-left text-sm font-normal outline-none hover:bg-brand/[0.03] focus:border-brand"
      >
        <span className={selected ? "text-foreground" : "text-ink-muted"}>
          {display}
        </span>
        <CalendarDaysIcon className="size-4 shrink-0 text-ink-muted" aria-hidden />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="dialog"
          aria-label={label}
          className="absolute top-[calc(100%+0.35rem)] left-0 z-50 w-[min(100%,19rem)] rounded-xl border border-brand/15 bg-white p-3 shadow-[0_18px_40px_rgba(26,28,31,0.12)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-brand/5 hover:text-foreground"
              aria-label={t.common.prevMonth}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold text-foreground">
              {format(month, locale === "en" ? "MMMM yyyy" : "yyyy년 M월", {
                locale: dateFnsLocale,
              })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-brand/5 hover:text-foreground"
              aria-label={t.common.nextMonth}
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-ink-muted">
            {weekdays.map((day, index) => (
              <span key={`${index}-${day}`} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, month);
              const selectedDay = selected ? isSameDay(day, selected) : false;
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(toYmd(day));
                    setOpen(false);
                  }}
                  className={`inline-flex aspect-square items-center justify-center rounded-full text-sm transition ${
                    selectedDay
                      ? "bg-brand font-semibold text-white shadow-sm"
                      : today
                        ? "bg-brand/10 font-semibold text-brand hover:bg-brand/15"
                        : inMonth
                          ? "text-foreground hover:bg-brand/5"
                          : "text-ink-muted/45 hover:bg-neutral-100"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-brand/10 pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-neutral-100 hover:text-foreground"
            >
              {t.common.clear}
            </button>
            <button
              type="button"
              onClick={() => {
                const todayDate = new Date();
                onChange(toYmd(todayDate));
                setMonth(todayDate);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/5"
            >
              {t.common.today}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
