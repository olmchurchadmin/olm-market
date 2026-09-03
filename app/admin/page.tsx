import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { ResolveComplaintButton } from "@/components/resolve-complaint-button";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats } from "@/lib/types";
import { accountDisplayName, formatPersonName, formatPrice, orderStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; resolved?: string }>;
}) {
  await requireAdmin();
  const { locale, t } = await getI18n();
  const { error, resolved } = await searchParams;
  const supabase = await createClient();

  const [
    { data: weekStats },
    { data: monthStats },
    { data: allStats },
    { data: members },
    { data: complaints },
    { data: orders },
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
        "id, subject, body, status, created_at, resolved_at, user:profiles!complaints_user_id_fkey(email, full_name, nickname)",
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
  ]);

  const week = (weekStats || {}) as AdminStats;
  const month = (monthStats || {}) as AdminStats;
  const all = (allStats || {}) as AdminStats;
  const openComplaints = (complaints || []).filter((c) => c.status === "open");
  const resolvedComplaints = (complaints || []).filter(
    (c) => c.status === "resolved",
  );

  const tradeRows = (orders || []).map((order) => {
    const listing = Array.isArray(order.listings)
      ? order.listings[0]
      : order.listings;
    const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
    const seller = Array.isArray(order.seller) ? order.seller[0] : order.seller;
    return {
      order,
      title: listing?.title || "—",
      homePickup: listing?.pickup_method === "seller_location",
      buyer,
      seller,
    };
  });
  const activeTrades = tradeRows.filter((r) => r.order.status !== "completed");
  const completedTrades = tradeRows.filter((r) => r.order.status === "completed");

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
        <Link
          href="/"
          className="text-sm text-ink-muted hover:text-brand"
        >
          {t.admin.toMarket}
        </Link>
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

      <section className="mt-8">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <ChartBarIcon className="size-6" aria-hidden />
          {t.admin.stats}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-brand/10 bg-white/70 p-4">
            <p className="text-sm font-semibold text-brand">{t.admin.thisWeek}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label={t.admin.listings} value={week.new_listings ?? 0} />
              <StatCard label={t.admin.sold} value={week.sold ?? 0} />
              <StatCard
                label={t.admin.gmv}
                value={formatPrice(week.gmv_cents ?? 0, locale)}
              />
              <StatCard label={t.admin.activeUsers} value={week.active_users ?? 0} />
            </div>
          </div>
          <div className="rounded-lg border border-brand/10 bg-white/70 p-4">
            <p className="text-sm font-semibold text-brand">{t.admin.thisMonth}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard label={t.admin.listings} value={month.new_listings ?? 0} />
              <StatCard label={t.admin.sold} value={month.sold ?? 0} />
              <StatCard
                label={t.admin.gmv}
                value={formatPrice(month.gmv_cents ?? 0, locale)}
              />
              <StatCard
                label={t.admin.activeUsers}
                value={month.active_users ?? 0}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.admin.allListings} value={all.new_listings ?? 0} />
          <StatCard label={t.admin.allSold} value={all.sold ?? 0} />
          <StatCard
            label={t.admin.allGmv}
            value={formatPrice(all.gmv_cents ?? 0, locale)}
          />
          <StatCard
            label={t.admin.pipeline}
            value={`${all.orders_awaiting_dropoff ?? 0} / ${all.orders_ready_for_pickup ?? 0}`}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <UsersIcon className="size-6" aria-hidden />
          {t.admin.members}
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-brand/10 bg-white/70">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand/10 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.admin.name}</th>
                <th className="px-4 py-3 font-medium">{t.admin.email}</th>
                <th className="px-4 py-3 font-medium">{t.admin.phone}</th>
                <th className="px-4 py-3 font-medium">{t.admin.role}</th>
                <th className="px-4 py-3 font-medium">{t.admin.joined}</th>
              </tr>
            </thead>
            <tbody>
              {(members || []).map((member) => (
                <tr key={member.id} className="border-t border-brand/5">
                  <td className="px-4 py-3">
                    {accountDisplayName(member)}
                  </td>
                  <td className="px-4 py-3 break-all">{member.email || "—"}</td>
                  <td className="px-4 py-3">{member.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {member.role === "admin" ? (
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                        admin
                      </span>
                    ) : (
                      "user"
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(member.created_at).toLocaleDateString(
                      locale === "en" ? "en-US" : "ko-KR",
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!members?.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">{t.admin.noMembers}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <ExclamationTriangleIcon className="size-6" aria-hidden />
          {t.admin.complaints}
        </h2>
        <div className="mt-4 rounded-lg border border-brand/10 bg-white/70 p-4">
          <p className="text-sm text-ink-muted">
            {t.admin.unresolved} {openComplaints.length} · {t.admin.resolved}{" "}
            {resolvedComplaints.length}
          </p>
          <ul className="mt-4 space-y-3">
            {(complaints || []).length ? (
              (complaints || []).map((item) => {
                const user = Array.isArray(item.user) ? item.user[0] : item.user;
                const isOpen = item.status === "open";
                return (
                  <li
                    key={item.id}
                    className={`rounded-md border px-4 py-3 ${
                      isOpen
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-brand/10 bg-[color-mix(in_oklab,var(--background)_55%,white)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {item.subject}
                          </p>
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              isOpen
                                ? "bg-amber-200/80 text-amber-950"
                                : "bg-brand/15 text-brand"
                            }`}
                          >
                            {isOpen ? t.admin.unresolved : t.admin.resolved}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          {user
                            ? `${accountDisplayName(user)} · ${user.email || ""}`
                            : "—"}{" "}
                          ·{" "}
                          {new Date(item.created_at).toLocaleString(
                            locale === "en" ? "en-US" : "ko-KR",
                          )}
                          {!isOpen && item.resolved_at
                            ? ` · ${t.admin.resolved} ${new Date(item.resolved_at).toLocaleString(
                                locale === "en" ? "en-US" : "ko-KR",
                              )}`
                            : ""}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {item.body}
                        </p>
                      </div>
                      {isOpen ? (
                        <ResolveComplaintButton complaintId={item.id} />
                      ) : null}
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-ink-muted">{t.admin.noComplaints}</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <ShoppingBagIcon className="size-6" aria-hidden />
          {t.admin.orders}
        </h2>

        <h3 className="mt-6 text-sm font-semibold text-brand">
          {t.admin.activeTrades} ({activeTrades.length})
        </h3>
        <div className="mt-3 space-y-3">
          {activeTrades.length ? (
            activeTrades.map(({ order, title, homePickup, buyer, seller }) => (
              <div
                key={order.id}
                className="rounded-lg border border-brand/15 bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{title}</p>
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {homePickup
                          ? t.market.pickupSeller
                          : t.market.pickupChurch}
                      </span>
                      <span className="rounded bg-sun px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {orderStatusLabel(order.status, t.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatPrice(order.price_cents, locale)} ·{" "}
                      {new Date(order.created_at).toLocaleString(
                        locale === "en" ? "en-US" : "ko-KR",
                      )}
                    </p>
                  </div>
                  <AdminOrderActions
                    orderId={order.id}
                    status={order.status}
                    homePickup={homePickup}
                  />
                </div>

                <dl className="mt-3 grid gap-2 border-t border-brand/10 pt-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-ink-muted">{t.admin.seller}</dt>
                    <dd className="text-foreground">
                      {formatPersonName(seller, "—")}
                      {seller?.phone ? ` · ${seller.phone}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">{t.admin.buyer}</dt>
                    <dd className="text-foreground">
                      {formatPersonName(buyer, "—")}
                      {buyer?.phone ? ` · ${buyer.phone}` : ""}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  {homePickup
                    ? t.admin.homePickupHint
                    : order.status === "awaiting_dropoff"
                      ? t.admin.churchDropoffHint
                      : t.admin.churchPickupHint}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-muted">{t.admin.noActiveTrades}</p>
          )}
        </div>

        <h3 className="mt-8 text-sm font-semibold text-brand">
          {t.admin.completedTrades} ({completedTrades.length})
        </h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-brand/10 bg-white/70">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand/10 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.admin.item}</th>
                <th className="px-4 py-3 font-medium">{t.admin.seller}</th>
                <th className="px-4 py-3 font-medium">{t.admin.buyer}</th>
                <th className="px-4 py-3 font-medium">{t.admin.pickup}</th>
                <th className="px-4 py-3 font-medium">{t.admin.amount}</th>
              </tr>
            </thead>
            <tbody>
              {completedTrades.map(({ order, title, homePickup, buyer, seller }) => (
                <tr key={order.id} className="border-t border-brand/5">
                  <td className="px-4 py-3">{title}</td>
                  <td className="px-4 py-3">{formatPersonName(seller, "—")}</td>
                  <td className="px-4 py-3">{formatPersonName(buyer, "—")}</td>
                  <td className="px-4 py-3">
                    {homePickup ? t.market.pickupSeller : t.market.pickupChurch}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(order.price_cents, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!completedTrades.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">
              {t.admin.noCompletedTrades}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
