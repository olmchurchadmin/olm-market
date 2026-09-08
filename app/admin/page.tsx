import Link from "next/link";
import { AdminBannerPanel } from "@/components/admin-banner-panel";
import { AdminCategoriesPanel } from "@/components/admin-categories-panel";
import {
  AdminComplaintsPanel,
  AdminListingsPanel,
  AdminMembersPanel,
  AdminOrdersPanel,
} from "@/components/admin-list-panels";
import { AdminShell } from "@/components/admin-shell";
import { AdminStatsPanel } from "@/components/admin-stats-panel";
import type { AdminTab } from "@/components/admin-tabs";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats, Category, Listing, SiteBanner } from "@/lib/types";

export const dynamic = "force-dynamic";

type StatsRange = "all" | "week" | "month";

function parseTab(raw: string | undefined): AdminTab {
  if (
    raw === "stats" ||
    raw === "members" ||
    raw === "complaints" ||
    raw === "orders" ||
    raw === "listings" ||
    raw === "categories" ||
    raw === "banner"
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    resolved?: string;
    deleted?: string;
    memberDeleted?: string;
    complaintDeleted?: string;
    orderDeleted?: string;
    categoryAdded?: string;
    categoryDeleted?: string;
    categoryUpdated?: string;
    categoryReordered?: string;
    bannerSaved?: string;
    tab?: string;
    range?: string;
  }>;
}) {
  const adminProfile = await requireAdmin();
  const { t } = await getI18n();
  const {
    error,
    resolved,
    deleted,
    memberDeleted,
    complaintDeleted,
    orderDeleted,
    categoryAdded,
    categoryDeleted,
    categoryUpdated,
    categoryReordered,
    bannerSaved,
    tab: tabParam,
    range: rangeParam,
  } = await searchParams;
  const tab = parseTab(tabParam);
  const range = parseRange(rangeParam);
  const supabase = await createClient();

  // Badges only need counts - always cheap, parallel with the active-tab payload.
  const badgePromise = Promise.all([
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["awaiting_dropoff", "ready_for_pickup"]),
  ]);

  let initialStats: AdminStats | null = null;
  let members:
    | {
        id: string;
        email: string | null;
        full_name: string | null;
        nickname: string | null;
        phone: string | null;
        role: string;
        created_at: string;
      }[]
    | null = null;
  let complaints: unknown[] | null = null;
  let orders: unknown[] | null = null;
  let allListings: unknown[] | null = null;
  let categories: unknown[] | null = null;
  let siteBanner: SiteBanner | null = null;

  if (tab === "stats") {
    const { data } = await supabase.rpc("admin_stats", { p_range: range });
    initialStats = (data || {}) as AdminStats;
  } else if (tab === "members") {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, nickname, phone, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    members = data;
  } else if (tab === "complaints") {
    const { data } = await supabase
      .from("complaints")
      .select(
        "id, subject, body, status, admin_reply, created_at, resolved_at, user:profiles!complaints_user_id_fkey(email, full_name, nickname)",
      )
      .order("created_at", { ascending: false })
      .limit(40);
    complaints = data;
  } else if (tab === "orders") {
    const { data } = await supabase
      .from("orders")
      .select(
        "*, listings(title, pickup_method), buyer:profiles!orders_buyer_id_fkey(email, phone, full_name, nickname), seller:profiles!orders_seller_id_fkey(email, phone, full_name, nickname)",
      )
      .in("status", ["awaiting_dropoff", "ready_for_pickup", "completed"])
      .order("created_at", { ascending: false })
      .limit(50);
    orders = data;
  } else if (tab === "listings") {
    const { data } = await supabase
      .from("listings")
      .select(
        "*, seller:profiles!listings_seller_id_fkey(email, full_name, nickname)",
      )
      .neq("status", "cancelled")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    allListings = data;
  } else if (tab === "categories") {
    const { data } = await supabase
      .from("categories")
      .select("id, slug, name_ko, name_en, sort_order")
      .order("sort_order", { ascending: true });
    categories = data;
  } else if (tab === "banner") {
    const { data } = await supabase
      .from("site_banner")
      .select(
        "id, enabled, body_ko, body_en, cta_label_ko, cta_label_en, cta_url, image_path, starts_at, ends_at, updated_at",
      )
      .eq("id", 1)
      .maybeSingle();
    siteBanner = (data as SiteBanner | null) ?? null;
  }

  const [{ count: openComplaintCount }, { count: activeTradeCount }] =
    await badgePromise;

  const tradeRows = ((orders || []) as Array<{
    id: string;
    status: string;
    price_cents: number;
    created_at: string;
    listings?:
      | { title?: string | null; pickup_method?: string | null }
      | { title?: string | null; pickup_method?: string | null }[]
      | null;
    buyer?:
      | {
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          nickname?: string | null;
        }
      | {
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          nickname?: string | null;
        }[]
      | null;
    seller?:
      | {
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          nickname?: string | null;
        }
      | {
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          nickname?: string | null;
        }[]
      | null;
  }>).map((order) => {
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
      title: listing?.title || "-",
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
        <AdminShell
          active={tab}
          openComplaints={openComplaintCount ?? 0}
          activeTrades={activeTradeCount ?? 0}
        >
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
      {orderDeleted ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.orderDeletedFlash}
        </p>
      ) : null}
      {categoryAdded ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.categoryAddedFlash}
        </p>
      ) : null}
      {categoryDeleted ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.categoryDeletedFlash}
        </p>
      ) : null}
      {categoryUpdated ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.categoryUpdatedFlash}
        </p>
      ) : null}
      {categoryReordered ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.categoryReorderedFlash}
        </p>
      ) : null}
      {bannerSaved ? (
        <p className="mt-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.admin.bannerSavedFlash}
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

      {tab === "stats" && initialStats ? (
        <AdminStatsPanel initialStats={initialStats} initialRange={range} />
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
          complaints={(
            (complaints || []) as Array<{
              id: string;
              subject: string;
              body: string;
              status: string;
              created_at: string;
              resolved_at: string | null;
              admin_reply?: string | null;
              user?:
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
            }>
          ).map((item) => {
            const user = Array.isArray(item.user) ? item.user[0] : item.user;
            return {
              id: item.id,
              subject: item.subject,
              body: item.body,
              status: item.status,
              created_at: item.created_at,
              resolved_at: item.resolved_at,
              admin_reply: item.admin_reply ?? null,
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

      {tab === "categories" ? (
        <AdminCategoriesPanel
          categories={(categories || []) as Category[]}
        />
      ) : null}

      {tab === "banner" ? <AdminBannerPanel banner={siteBanner} /> : null}
        </AdminShell>
      </div>
    </main>
  );
}
