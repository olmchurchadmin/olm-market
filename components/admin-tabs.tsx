"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/components/locale-provider";

export type AdminTab =
  | "orders"
  | "listings"
  | "stats"
  | "members"
  | "complaints"
  | "categories";

export function AdminTabs({
  active,
  openComplaints = 0,
  activeTrades = 0,
}: {
  active: AdminTab;
  openComplaints?: number;
  activeTrades?: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<AdminTab | null>(null);

  useEffect(() => {
    setPendingTab(null);
  }, [active]);

  const tabs: { key: AdminTab; label: string; badge?: number }[] = [
    { key: "stats", label: t.admin.stats },
    {
      key: "orders",
      label: t.admin.orders,
      badge: activeTrades > 0 ? activeTrades : undefined,
    },
    { key: "listings", label: t.admin.listingsTab },
    { key: "members", label: t.admin.members },
    {
      key: "complaints",
      label: t.admin.complaints,
      badge: openComplaints > 0 ? openComplaints : undefined,
    },
    { key: "categories", label: t.admin.categoriesTab },
  ];

  const displayActive = pendingTab ?? active;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-brand/10 pb-4">
      {tabs.map((tab) => {
        const isActive = displayActive === tab.key;
        const isLoading = pending && pendingTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={`/admin?tab=${tab.key}`}
            prefetch
            aria-current={isActive ? "page" : undefined}
            aria-busy={isLoading || undefined}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              if (tab.key === active && !pendingTab) return;
              event.preventDefault();
              setPendingTab(tab.key);
              startTransition(() => {
                router.push(`/admin?tab=${tab.key}`);
              });
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-brand text-white shadow-sm"
                : "bg-white text-foreground ring-1 ring-brand/10 hover:bg-neutral-100"
            } ${isLoading ? "opacity-80" : ""}`}
          >
            {tab.label}
            {tab.badge != null ? (
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
