import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { AdminSmsTest } from "@/components/admin-sms-test";
import { ResolveComplaintButton } from "@/components/resolve-complaint-button";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats } from "@/lib/types";
import { accountDisplayName, formatPrice, orderStatusLabel } from "@/lib/utils";

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
  const adminProfile = await requireAdmin();
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
    { data: smsJobs },
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
        "*, listings(title), buyer:profiles!orders_buyer_id_fkey(email, full_name), seller:profiles!orders_seller_id_fkey(email, full_name)",
      )
      .in("status", ["awaiting_dropoff", "ready_for_pickup", "completed"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notification_jobs")
      .select("id, channel, status, error, recipient, created_at")
      .in("channel", ["sms", "kakao"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const week = (weekStats || {}) as AdminStats;
  const month = (monthStats || {}) as AdminStats;
  const all = (allStats || {}) as AdminStats;
  const openComplaints = (complaints || []).filter((c) => c.status === "open");
  const resolvedComplaints = (complaints || []).filter(
    (c) => c.status === "resolved",
  );

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

      <section className="mt-12 space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
          {t.admin.smsJobs}
        </h2>
        <AdminSmsTest
          hasPhone={Boolean(adminProfile.phone)}
          labels={{
            title: t.admin.smsTitle,
            blurb: t.admin.smsBlurb,
            cta: t.admin.smsCta,
            noPhone: t.admin.smsNoPhone,
            working: t.common.loading,
          }}
        />
        <div className="overflow-x-auto rounded-lg border border-brand/10 bg-white/70">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand/10 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.admin.smsTime}</th>
                <th className="px-4 py-3 font-medium">{t.admin.smsRecipient}</th>
                <th className="px-4 py-3 font-medium">{t.admin.smsStatus}</th>
                <th className="px-4 py-3 font-medium">{t.admin.smsError}</th>
              </tr>
            </thead>
            <tbody>
              {(smsJobs || []).map((job) => (
                <tr key={job.id} className="border-t border-brand/5 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(job.created_at).toLocaleString(
                      locale === "en" ? "en-US" : "ko-KR",
                    )}
                  </td>
                  <td className="px-4 py-3">{job.recipient}</td>
                  <td className="px-4 py-3 font-medium">{job.status}</td>
                  <td className="px-4 py-3 break-all text-xs text-ink-muted">
                    {job.error || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!smsJobs?.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">{t.admin.smsNoJobs}</p>
          ) : null}
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
        <div className="mt-4 overflow-x-auto rounded-lg border border-brand/10 bg-white/70">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand/10 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.admin.item}</th>
                <th className="px-4 py-3 font-medium">{t.admin.buyer}</th>
                <th className="px-4 py-3 font-medium">{t.admin.seller}</th>
                <th className="px-4 py-3 font-medium">{t.admin.amount}</th>
                <th className="px-4 py-3 font-medium">{t.admin.status}</th>
                <th className="px-4 py-3 font-medium">{t.admin.action}</th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((order) => {
                const listing = Array.isArray(order.listings)
                  ? order.listings[0]
                  : order.listings;
                const buyer = Array.isArray(order.buyer)
                  ? order.buyer[0]
                  : order.buyer;
                const seller = Array.isArray(order.seller)
                  ? order.seller[0]
                  : order.seller;
                return (
                  <tr key={order.id} className="border-t border-brand/5">
                    <td className="px-4 py-3">{listing?.title || "—"}</td>
                    <td className="px-4 py-3">
                      {buyer?.full_name || buyer?.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {seller?.full_name || seller?.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatPrice(order.price_cents, locale)}
                    </td>
                    <td className="px-4 py-3">
                      {orderStatusLabel(order.status, t.status)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminOrderActions
                        orderId={order.id}
                        status={order.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!orders?.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">{t.admin.noOrders}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
