import { BellIcon } from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
import { DeleteAllNotificationsButton } from "@/components/delete-all-notifications-button";
import { DeleteNotificationButton } from "@/components/delete-notification-button";
import { MarkAllReadButton } from "@/components/mark-all-read-button";
import { NotificationDetailRows } from "@/components/notification-detail-rows";
import { SharePickupDetails } from "@/components/share-pickup-details";
import { getCurrentProfile } from "@/lib/auth";
import {
  localizeNotification,
  type NotificationPayload,
} from "@/lib/i18n/notifications";
import { getI18n } from "@/lib/i18n/server";
import {
  groupNotifications,
  notificationGroupStatusLabel,
  tradeTrackSteps,
  type NotificationRow,
} from "@/lib/notifications/group";
import { createClient } from "@/lib/supabase/server";
import { accountDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const profile = await getCurrentProfile();
  const { locale, t } = await getI18n();

  if (!profile) return null;

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(80);

  const rows: NotificationRow[] = (notifications || []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    payload: n.payload as NotificationPayload,
    read_at: n.read_at,
    created_at: n.created_at,
  }));

  const orderIds = [
    ...new Set(
      rows
        .map((n) => n.payload?.order_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const listingIdByOrderId = new Map<string, string>();
  if (orderIds.length) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, listing_id")
      .in("id", orderIds);
    for (const order of orders || []) {
      if (order.listing_id) {
        listingIdByOrderId.set(order.id, order.listing_id);
      }
    }
  }

  const groups = groupNotifications(rows, listingIdByOrderId, locale);

  const pickupDetailOrderIds = new Set(
    rows
      .filter((n) => n.type === "order_pickup_details")
      .map((n) => n.payload?.order_id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${t.account.notifications}`}
      active="notifications"
    >
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
              <BellIcon className="size-6" aria-hidden />
              {t.account.notifications}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t.account.notificationGroupBlurb}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MarkAllReadButton />
            <DeleteAllNotificationsButton
              hasNotifications={Boolean(rows.length)}
            />
          </div>
        </div>

        <ul className="mt-4 space-y-4">
          {groups.length ? (
            groups.map((group) => {
              const statusLabel = notificationGroupStatusLabel(
                group.statusKey,
                t,
              );
              const track = tradeTrackSteps(group, t);
              const headerTitle = group.itemTitle
                ? group.priceLabel
                  ? `${group.itemTitle} (${group.priceLabel})`
                  : group.itemTitle
                : t.account.notifications;

              return (
                <li
                  key={group.key}
                  className={`rounded-md border px-4 py-4 ${
                    group.hasUnread
                      ? "border-brand/25 bg-[#f5f8ff]"
                      : "border-brand/10 bg-white/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {headerTitle}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        {group.publicListingId ? (
                          <span>
                            {t.market.listingId}:{" "}
                            <span className="font-mono font-medium text-foreground/80">
                              {group.publicListingId}
                            </span>
                          </span>
                        ) : null}
                        {group.kind === "order" ||
                        group.statusKey !== "other" ? (
                          <span>
                            {t.account.notificationCurrentStatus}:{" "}
                            <span className="font-medium text-brand">
                              {statusLabel}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <DeleteNotificationButton
                      ids={group.items.map((n) => n.id)}
                      ariaLabel={t.account.notificationDeleteGroupAria}
                    />
                  </div>

                  {track ? (
                    <ol className="mt-3 flex flex-wrap items-center gap-2">
                      {track.map((step, index) => (
                        <li
                          key={step.key}
                          className="flex items-center gap-2 text-xs"
                        >
                          {index > 0 ? (
                            <span
                              className={`h-px w-4 ${
                                step.done ? "bg-brand/50" : "bg-brand/15"
                              }`}
                              aria-hidden
                            />
                          ) : null}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                              step.done
                                ? "bg-brand/15 font-medium text-brand"
                                : step.current
                                  ? "border border-brand/25 bg-white font-medium text-ink-muted"
                                  : "bg-black/[0.04] text-ink-muted"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                step.done
                                  ? "bg-brand"
                                  : step.current
                                    ? "bg-brand/35"
                                    : "bg-ink-muted/40"
                              }`}
                              aria-hidden
                            />
                            {step.label}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  <ul className="mt-3 space-y-3 border-t border-brand/10 pt-3">
                    {group.items.map((n) => {
                      const copy = localizeNotification(
                        {
                          type: n.type,
                          title: n.title,
                          body: n.body,
                          payload: n.payload,
                        },
                        t,
                        locale,
                      );
                      const unread = !n.read_at;
                      const payload = n.payload;
                      const showPickupForm =
                        n.type === "order_reserved" &&
                        payload?.role === "seller" &&
                        payload?.pickup_method === "seller_location" &&
                        typeof payload?.order_id === "string";

                      return (
                        <li
                          key={n.id}
                          className={`rounded-md px-3 py-2.5 ${
                            unread ? "bg-white/80" : "bg-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{copy.title}</p>
                            {group.items.length > 1 ? (
                              <DeleteNotificationButton id={n.id} />
                            ) : null}
                          </div>
                          <NotificationDetailRows
                            details={copy.details}
                            t={t}
                            compact
                          />
                          <p className="mt-1.5 text-sm whitespace-pre-line text-ink-muted">
                            {copy.body}
                          </p>
                          <p className="mt-1.5 text-xs text-ink-muted/80">
                            {new Date(n.created_at).toLocaleString(
                              locale === "en" ? "en-US" : "ko-KR",
                            )}
                          </p>
                          {showPickupForm ? (
                            <SharePickupDetails
                              orderId={payload!.order_id!}
                              defaultContact={profile.phone || ""}
                              alreadySent={Boolean(
                                payload?.order_id &&
                                  pickupDetailOrderIds.has(payload.order_id),
                              )}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
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
    </AccountShell>
  );
}
