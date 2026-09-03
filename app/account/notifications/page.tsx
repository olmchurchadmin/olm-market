import { BellIcon } from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
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
    .limit(50);

  const pickupDetailOrderIds = new Set(
    (notifications || [])
      .filter((n) => n.type === "order_pickup_details")
      .map((n) => (n.payload as NotificationPayload)?.order_id)
      .filter(Boolean) as string[],
  );

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${t.account.notifications}`}
      active="notifications"
    >
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
            <BellIcon className="size-6" aria-hidden />
            {t.account.notifications}
          </h2>
          <MarkAllReadButton />
        </div>
        <ul className="mt-4 space-y-3">
          {(notifications || []).length ? (
            notifications!.map((n) => {
              const copy = localizeNotification(
                {
                  type: n.type,
                  title: n.title,
                  body: n.body,
                  payload: n.payload as NotificationPayload,
                },
                t,
                locale,
              );
              const unread = !n.read_at;
              const payload = n.payload as NotificationPayload;
              const showPickupForm =
                n.type === "order_reserved" &&
                payload?.role === "seller" &&
                payload?.pickup_method === "seller_location" &&
                typeof payload?.order_id === "string";
              return (
                <li
                  key={n.id}
                  className={`rounded-md border px-4 py-3 ${
                    unread
                      ? "border-brand/20 bg-[#f5f8ff]"
                      : "border-brand/10 bg-white/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{copy.title}</p>
                    <DeleteNotificationButton id={n.id} />
                  </div>
                  <NotificationDetailRows details={copy.details} t={t} />
                  <p className="mt-2 text-sm whitespace-pre-line text-ink-muted">
                    {copy.body}
                  </p>
                  <p className="mt-2 text-xs text-ink-muted/80">
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
