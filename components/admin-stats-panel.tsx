"use client";

import { ArrowPathIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SalesDonationRing } from "@/components/admin-sales-donation-ring";
import { useConfirm } from "@/components/confirm-dialog";
import { useI18n } from "@/components/locale-provider";
import {
  loadAdminStatsRangeAction,
  resetAdminStatsAction,
} from "@/lib/actions/admin-stats";
import type { AdminStats } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type StatsRange = "all" | "week" | "month";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-brand/10 bg-white/70 p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function formatResetDate(iso: string | null | undefined, locale: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminStatsPanel({
  initialStats,
  initialRange,
}: {
  initialStats: AdminStats;
  initialRange: StatsRange;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const [range, setRange] = useState<StatsRange>(initialRange);
  const [cache, setCache] = useState<Partial<Record<StatsRange, AdminStats>>>({
    [initialRange]: initialStats,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rangePending, startRangeTransition] = useTransition();
  const stats = cache[range] || initialStats;
  const resetLabel = formatResetDate(
    stats.stats_reset_at ?? cache.all?.stats_reset_at,
    locale,
  );

  const rangeTabs: { key: StatsRange; label: string }[] = [
    { key: "all", label: t.admin.rangeAll },
    { key: "week", label: t.admin.rangeWeek },
    { key: "month", label: t.admin.rangeMonth },
  ];

  function selectRange(next: StatsRange) {
    setRange(next);
    window.history.replaceState(null, "", `/admin?tab=stats&range=${next}`);
    if (cache[next]) return;
    startRangeTransition(async () => {
      const result = await loadAdminStatsRangeAction(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCache((prev) => ({ ...prev, [next]: result.stats }));
    });
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
            <ChartBarIcon className="size-6" aria-hidden />
            {t.admin.stats}
          </h2>
          {resetLabel ? (
            <p className="mt-1 text-xs text-ink-muted">
              {t.admin.resetStatsSince.replace("{date}", resetLabel)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: t.admin.resetStatsTitle,
              message: t.admin.resetStatsMessage,
              confirmLabel: t.admin.resetStatsConfirm,
              cancelLabel: t.common.cancel,
              tone: "danger",
            });
            if (!ok) return;
            setError(null);
            startTransition(async () => {
              const result = await resetAdminStatsAction();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/15 bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-brand/5 disabled:opacity-60"
        >
          <ArrowPathIcon className="size-4" aria-hidden />
          {pending ? t.common.loading : t.admin.resetStats}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {rangeTabs.map((item) => {
          const active = range === item.key;
          return (
            <button
              key={item.key}
              type="button"
              disabled={rangePending}
              onClick={() => selectRange(item.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                active
                  ? "bg-brand text-white shadow-sm"
                  : "bg-white text-foreground ring-1 ring-brand/10 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className={`mt-5 grid gap-4 lg:grid-cols-2 ${
          rangePending && !cache[range] ? "opacity-60" : ""
        }`}
      >
        <SalesDonationRing
          salesCents={stats.gmv_cents ?? 0}
          donationCents={stats.donation_cents ?? 0}
          salesLabel={t.admin.totalSales}
          donationLabel={t.admin.totalDonation}
          formatMoney={(cents) => formatPrice(cents, locale)}
        />
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label={t.admin.listings}
            value={stats.new_listings ?? 0}
          />
          <StatCard label={t.admin.sold} value={stats.sold ?? 0} />
          <StatCard
            label={t.admin.totalUsers}
            value={stats.total_users ?? 0}
          />
          <StatCard
            label={t.admin.activeUsers}
            value={stats.active_users ?? 0}
          />
          <StatCard
            label={t.admin.awaitingDropoff}
            value={stats.orders_awaiting_dropoff ?? 0}
          />
          <StatCard
            label={t.admin.readyForPickup}
            value={stats.orders_ready_for_pickup ?? 0}
          />
        </div>
      </div>
    </section>
  );
}
