"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { SalesDonationRing } from "@/components/admin-sales-donation-ring";
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

export function AdminStatsPanel({
  statsByRange,
  initialRange,
}: {
  statsByRange: Record<StatsRange, AdminStats>;
  initialRange: StatsRange;
}) {
  const { locale, t } = useI18n();
  const [range, setRange] = useState<StatsRange>(initialRange);
  const stats = statsByRange[range];

  const rangeTabs: { key: StatsRange; label: string }[] = [
    { key: "all", label: t.admin.rangeAll },
    { key: "week", label: t.admin.rangeWeek },
    { key: "month", label: t.admin.rangeMonth },
  ];

  function selectRange(next: StatsRange) {
    setRange(next);
    // Update the URL without triggering a Next.js RSC refetch.
    window.history.replaceState(null, "", `/admin?tab=stats&range=${next}`);
  }

  return (
    <section className="mt-8">
      <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
        <ChartBarIcon className="size-6" aria-hidden />
        {t.admin.stats}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {rangeTabs.map((item) => {
          const active = range === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectRange(item.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
