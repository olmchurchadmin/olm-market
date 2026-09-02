import { BellIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
import { AdminCompleteTradeButton } from "@/components/admin-complete-trade-button";
import { NotificationDetailRows } from "@/components/notification-detail-rows";
import { getCurrentProfile } from "@/lib/auth";
import { localizeNotification } from "@/lib/i18n/notifications";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import {
  accountDisplayName,
  formatPrice,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

function personName(
  person:
    | { nickname?: string | null; full_name?: string | null; email?: string | null }
    | null
    | undefined,
  fallback: string,
) {
  return (
    person?.nickname?.trim() ||
    person?.full_name?.trim() ||
    person?.email?.trim() ||
    fallback
  );
}

function pickupLabel(
  method: string | null | undefined,
  church: string,
  seller: string,
) {
  if (method === "seller_location") return seller;
  return church;
}

export default async function AccountNotificationsPage() {
  const profile = await getCurrentProfile();
  const { locale, t } = await getI18n();

  if (!profile) return null;

  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const [{ data: notifications }, activeOrdersResult, completedOrdersResult] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50),
      isAdmin
        ? supabase
            .from("orders")
            .select(
              "id, status, price_cents, created_at, completed_at, listings(title, pickup_method), buyer:profiles!orders_buyer_id_fkey(nickname, full_name, email), seller:profiles!orders_seller_id_fkey(nickname, full_name, email)",
            )
            .in("status", ["awaiting_dropoff", "ready_for_pickup"])
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase
            .from("orders")
            .select(
              "id, status, price_cents, created_at, completed_at, listings(title, pickup_method), buyer:profiles!orders_buyer_id_fkey(nickname, full_name, email), seller:profiles!orders_seller_id_fkey(nickname, full_name, email)",
            )
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: null }),
    ]);

  const activeOrders = activeOrdersResult.data || [];
  const completedOrders = completedOrdersResult.data || [];

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${t.account.notifications}`}
      active="notifications"
    >
      {isAdmin ? (
        <>
          <section>
            <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
              <BellIcon className="size-6" aria-hidden />
              {t.account.activeTrades}
            </h2>
            <ul className="mt-4 space-y-3">
              {activeOrders.length ? (
                activeOrders.map((order) => {
                  const listing = Array.isArray(order.listings)
                    ? order.listings[0]
                    : order.listings;
                  const buyer = Array.isArray(order.buyer)
                    ? order.buyer[0]
                    : order.buyer;
                  const seller = Array.isArray(order.seller)
                    ? order.seller[0]
                    : order.seller;
                  const itemTitle = listing?.title || t.account.item;
                  const price = formatPrice(order.price_cents, locale);
                  return (
                    <li
                      key={order.id}
                      className="flex flex-col gap-3 rounded-md border border-brand/20 bg-[#f5f8ff] px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {t.notify.reservedTitle}
                        </p>
                        <NotificationDetailRows
                          t={t}
                          details={{
                            item: itemTitle,
                            price,
                            seller: personName(seller, t.notify.sellerLabel),
                            buyer: personName(buyer, t.notify.buyerLabel),
                            pickup: pickupLabel(
                              listing?.pickup_method,
                              t.market.pickupChurch,
                              t.market.pickupSeller,
                            ),
                          }}
                        />
                        <p className="mt-2 text-xs text-ink-muted/80">
                          {new Date(order.created_at).toLocaleString(
                            locale === "en" ? "en-US" : "ko-KR",
                          )}
                        </p>
                      </div>
                      <AdminCompleteTradeButton orderId={order.id} />
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-ink-muted">
                  {t.account.noActiveTrades}
                </li>
              )}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
              <CheckCircleIcon className="size-6" aria-hidden />
              {t.account.completedTrades}
            </h2>
            <ul className="mt-4 space-y-3">
              {completedOrders.length ? (
                completedOrders.map((order) => {
                  const listing = Array.isArray(order.listings)
                    ? order.listings[0]
                    : order.listings;
                  const buyer = Array.isArray(order.buyer)
                    ? order.buyer[0]
                    : order.buyer;
                  const seller = Array.isArray(order.seller)
                    ? order.seller[0]
                    : order.seller;
                  const itemTitle = listing?.title || t.account.item;
                  const price = formatPrice(order.price_cents, locale);
                  const when = order.completed_at || order.created_at;
                  return (
                    <li
                      key={order.id}
                      className="rounded-md border border-brand/10 bg-white/70 px-4 py-3"
                    >
                      <p className="font-medium text-foreground">
                        {t.notify.completedTitle}
                      </p>
                      <NotificationDetailRows
                        t={t}
                        details={{
                          item: itemTitle,
                          price,
                          seller: personName(seller, t.notify.sellerLabel),
                          buyer: personName(buyer, t.notify.buyerLabel),
                          pickup: pickupLabel(
                            listing?.pickup_method,
                            t.market.pickupChurch,
                            t.market.pickupSeller,
                          ),
                        }}
                      />
                      <p className="mt-2 text-xs text-ink-muted/80">
                        {new Date(when).toLocaleString(
                          locale === "en" ? "en-US" : "ko-KR",
                        )}
                      </p>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-ink-muted">
                  {t.account.noCompletedTrades}
                </li>
              )}
            </ul>
          </section>
        </>
      ) : (
        <section>
          <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
            <BellIcon className="size-6" aria-hidden />
            {t.account.notifications}
          </h2>
          <ul className="mt-4 space-y-3">
            {(notifications || []).length ? (
              notifications!.map((n) => {
                const copy = localizeNotification(
                  {
                    type: n.type,
                    title: n.title,
                    body: n.body,
                    payload: n.payload as {
                      listing_title?: string;
                      price_cents?: number;
                      event?: string;
                      role?: string;
                      pickup_method?: string;
                      buyer_name?: string;
                      seller_name?: string;
                      counterparty_name?: string;
                    } | null,
                  },
                  t,
                  locale,
                );
                const unread = !n.read_at;
                return (
                  <li
                    key={n.id}
                    className={`rounded-md border px-4 py-3 ${
                      unread
                        ? "border-brand/20 bg-[#f5f8ff]"
                        : "border-brand/10 bg-white/70"
                    }`}
                  >
                    <p className="font-medium">{copy.title}</p>
                    <NotificationDetailRows details={copy.details} t={t} />
                    <p className="mt-2 text-sm text-ink-muted">{copy.body}</p>
                    <p className="mt-2 text-xs text-ink-muted/80">
                      {new Date(n.created_at).toLocaleString(
                        locale === "en" ? "en-US" : "ko-KR",
                      )}
                    </p>
                  </li>
                );
              })
            ) : (
              <li className="text-sm text-ink-muted">
                {t.account.noNotifications}
              </li>
            )}
          </ul>
        </section>
      )}
    </AccountShell>
  );
}
