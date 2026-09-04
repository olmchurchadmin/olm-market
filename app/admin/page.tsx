import {
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  AdminComplaintsPanel,
  AdminListingsPanel,
  AdminMembersPanel,
  AdminOrdersPanel,
} from "@/components/admin-list-panels";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats, Listing } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

function parseTab(raw: string | undefined): AdminTab {
  if (
    raw === "stats" ||
    raw === "members" ||
    raw === "complaints" ||
    raw === "orders" ||
    raw === "listings"
  ) {
    return raw;
  }
  return "stats";
}

function parseRange(raw: string | undefined): StatsRange {
  if (raw === "week" || raw === "month" || raw === "all") {
    return raw;
  }
  return "all";
}

function startOfRange(range: StatsRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "week") {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Monday start
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diff);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    resolved?: string;
    deleted?: string;
    memberDeleted?: string;
    complaintDeleted?: string;
    tab?: string;
    range?: string;
  }>;
}) {
  const adminProfile = await requireAdmin();
  const { locale, t } = await getI18n();
  const {
    error,
    resolved,
    deleted,
    memberDeleted,
    complaintDeleted,
    tab: tabParam,
    range: rangeParam,
  } = await searchParams;
  const tab = parseTab(tabParam);
  const range = parseRange(rangeParam);
  const supabase = await createClient();

  const [
    { data: weekStats },
    { data: monthStats },
    { data: allStats },
    { data: members },
    { data: complaints },
    { data: orders },
    { data: completedSales },
    { data: allListings },
  ] = await Promise.all([
    supabase.rpc("admin_stats", { p_range: "week" }),
    supabase.rpc("admin_stats", { p_range: "month" }),
    supabase.rpc("admin_stats", { p_range: "all" }),
    supabase
      .from("profiles")
      .select("id, email, full_name, nickname, phone, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("complaints")
      .select(
        "id, subject, body, status, admin_reply, created_at, resolved_at, user:profiles!complaints_user_id_fkey(email, full_name, nickname)",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("orders")
      .select(
        "*, listings(title, pickup_method), buyer:profiles!orders_buyer_id_fkey(email, phone, full_name, nickname), seller:profiles!orders_seller_id_fkey(email, phone, full_name, nickname)",
      )
      .in("status", ["awaiting_dropoff", "ready_for_pickup", "completed"])
      .order("created_at", { ascending: false })
      .limit(50),
    // Fallback donation totals if admin_stats hasn't been migrated yet.
    supabase
      .from("orders")
      .select("price_cents, completed_at, listings(donation_percent)")
      .eq("status", "completed")
      .limit(500),
    supabase
      .from("listings")
      .select(
        "*, seller:profiles!listings_seller_id_fkey(email, full_name, nickname)",
      )
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const week = (weekStats || {}) as AdminStats;
  const month = (monthStats || {}) as AdminStats;
  const all = (allStats || {}) as AdminStats;

  function donationFallback(target: StatsRange): number {
    const since = startOfRange(target);
    return (completedSales || []).reduce((sum, row) => {
      if (since && (!row.completed_at || new Date(row.completed_at) < since)) {
        return sum;
      }
      const listing = Array.isArray(row.listings)
        ? row.listings[0]
        : row.listings;
      const percent = Math.min(
        100,
        Math.max(30, Math.round(listing?.donation_percent ?? 100)),
      );
      return sum + Math.floor((Number(row.price_cents) * percent) / 100);
    }, 0);
  }

  function withDonation(stats: AdminStats, target: StatsRange): AdminStats {
    if (typeof stats.donation_cents === "number") return stats;
    return { ...stats, donation_cents: donationFallback(target) };
  }

  const statsByRange: Record<StatsRange, AdminStats> = {
    all: withDonation(all, "all"),
    week: withDonation(week, "week"),
    month: withDonation(month, "month"),
  };
  const stats = statsByRange[range];

  const openComplaints = (complaints || []).filter((c) => c.status === "open");

  const tradeRows = (orders || []).map((order) => {
    const listing = Array.isArray(order.listings)
      ? order.listings[0]
      : order.listings;
    const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
    const seller = Array.isArray(order.seller) ? order.seller[0] : order.seller;
    return {
      order: {
        id: order.id,
        status: order.status,
        price_cents: order.price_cents,
        created_at: order.created_at,
      },
      title: listing?.title || "—",
      homePickup: listing?.pickup_method === "seller_location",
      buyer: buyer
        ? {
            email: buyer.email ?? null,
            full_name: buyer.full_name ?? null,
            nickname: buyer.nickname ?? null,
            phone: buyer.phone ?? null,
          }
        : null,
      seller: seller
        ? {
            email: seller.email ?? null,
            full_name: seller.full_name ?? null,
            nickname: seller.nickname ?? null,
            phone: seller.phone ?? null,
          }
        : null,
    };
  });
  const activeTrades = tradeRows.filter((r) => r.order.status !== "completed");

  const rangeTabs: { key: StatsRange; label: string }[] = [
    { key: "all", label: t.admin.rangeAll },
    { key: "week", label: t.admin.rangeWeek },
    { key: "month", label: t.admin.rangeMonth },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-foreground sm:text-4xl">
            {t.admin.title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted sm:text-base">
            {t.admin.blurb}
          </p>
        </div>
        <Link href="/" className="text-sm text-ink-muted hover:text-brand">
          {t.admin.toMarket}
        </Link>
      </div>

      <div className="mt-8">
        <AdminTabs
          active={tab}
          openComplaints={openComplaints.length}
          activeTrades={activeTrades.length}
        />
      </div>

      {error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {resolved ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.complaintResolvedFlash}
        </p>
      ) : null}
      {deleted ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.listingDeletedFlash}
        </p>
      ) : null}
      {memberDeleted ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.memberDeletedFlash}
        </p>
      ) : null}
      {complaintDeleted ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.complaintDeletedFlash}
        </p>
      ) : null}

      {tab === "listings" ? (
        <AdminListingsPanel
          listings={
            (allListings || []) as (Listing & {
              seller?:
                | {
                    email?: string | null;
                    full_name?: string | null;
                    nickname?: string | null;
                  }
                | {
                    email?: string | null;
                    full_name?: string | null;
                    nickname?: string | null;
                  }[]
                | null;
            })[]
          }
        />
      ) : null}

      {tab === "stats" ? (
        <section className="mt-8">
          <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
            <ChartBarIcon className="size-6" aria-hidden />
            {t.admin.stats}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {rangeTabs.map((item) => {
              const active = range === item.key;
              return (
                <Link
                  key={item.key}
                  href={`/admin?tab=stats&range=${item.key}`}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand text-white shadow-sm"
                      : "bg-white text-foreground ring-1 ring-brand/10 hover:bg-neutral-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              label={t.admin.totalSales}
              value={formatPrice(stats.gmv_cents ?? 0, locale)}
            />
            <StatCard
              label={t.admin.totalDonation}
              value={formatPrice(stats.donation_cents ?? 0, locale)}
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
        </section>
      ) : null}

      {tab === "members" ? (
        <AdminMembersPanel
          currentUserId={adminProfile.id}
          members={(members || []).map((member) => ({
            id: member.id,
            email: member.email,
            full_name: member.full_name,
            nickname: member.nickname,
            phone: member.phone,
            role: member.role,
            created_at: member.created_at,
          }))}
        />
      ) : null}

      {tab === "complaints" ? (
        <AdminComplaintsPanel
          complaints={(complaints || []).map((item) => {
            const user = Array.isArray(item.user) ? item.user[0] : item.user;
            return {
              id: item.id,
              subject: item.subject,
              body: item.body,
              status: item.status,
              created_at: item.created_at,
              resolved_at: item.resolved_at,
              admin_reply:
                "admin_reply" in item
                  ? ((item as { admin_reply?: string | null }).admin_reply ??
                    null)
                  : null,
              user: user
                ? {
                    email: user.email ?? null,
                    full_name: user.full_name ?? null,
                    nickname: user.nickname ?? null,
                  }
                : null,
            };
          })}
        />
      ) : null}

      {tab === "orders" ? <AdminOrdersPanel trades={tradeRows} /> : null}
    </main>
  );
}
