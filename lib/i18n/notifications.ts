import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/utils";

type NotificationLike = {
  type: string;
  title: string;
  body: string;
  payload?: {
    listing_title?: string;
    price_cents?: number;
    event?: string;
  } | null;
};

export function localizeNotification(
  notification: NotificationLike,
  t: Dictionary,
  locale: string,
) {
  const hasDetails =
    Boolean(notification.payload?.listing_title) ||
    typeof notification.payload?.price_cents === "number";

  const itemTitle = notification.payload?.listing_title || t.account.item;
  const price = formatPrice(notification.payload?.price_cents ?? 0, locale);
  const fill = (template: string) =>
    template.replace("{title}", itemTitle).replace("{price}", price);

  const titles: Record<string, string> = {
    order_reserved: t.notify.reservedTitle,
    order_at_church: t.notify.atChurchTitle,
    order_completed: t.notify.completedTitle,
  };
  const bodies: Record<string, string> = {
    order_reserved: t.notify.reservedBody,
    order_at_church: t.notify.atChurchBody,
    order_completed: t.notify.completedBody,
  };

  const title = titles[notification.type] || notification.title;
  if (!bodies[notification.type]) {
    return { title, body: notification.body };
  }
  if (!hasDetails) {
    return { title, body: notification.body };
  }
  return { title, body: fill(bodies[notification.type]) };
}
