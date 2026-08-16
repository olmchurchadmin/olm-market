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
    role?: string;
    pickup_method?: string;
    buyer_name?: string;
    seller_name?: string;
    counterparty_name?: string;
  } | null;
};

export function localizeNotification(
  notification: NotificationLike,
  t: Dictionary,
  locale: string,
) {
  const itemTitle = notification.payload?.listing_title || t.account.item;
  const price = formatPrice(notification.payload?.price_cents ?? 0, locale);
  const buyer =
    notification.payload?.buyer_name ||
    notification.payload?.counterparty_name ||
    t.market.seller;
  const seller =
    notification.payload?.seller_name ||
    notification.payload?.counterparty_name ||
    t.market.seller;

  const fill = (template: string) =>
    template
      .replaceAll("{title}", itemTitle)
      .replaceAll("{price}", price)
      .replaceAll("{buyer}", buyer)
      .replaceAll("{seller}", seller);

  if (notification.type === "order_reserved") {
    const role = notification.payload?.role;
    const home = notification.payload?.pickup_method === "seller_location";

    if (role === "seller") {
      return {
        title: home
          ? t.notify.reservedSellerHomeTitle
          : t.notify.reservedSellerChurchTitle,
        body: fill(
          home
            ? t.notify.reservedSellerHomeBody
            : t.notify.reservedSellerChurchBody,
        ),
      };
    }
    if (role === "buyer") {
      return {
        title: home
          ? t.notify.reservedBuyerHomeTitle
          : t.notify.reservedBuyerChurchTitle,
        body: fill(
          home
            ? t.notify.reservedBuyerHomeBody
            : t.notify.reservedBuyerChurchBody,
        ),
      };
    }

    return {
      title: t.notify.reservedTitle,
      body: fill(t.notify.reservedBody),
    };
  }

  const titles: Record<string, string> = {
    order_at_church: t.notify.atChurchTitle,
    order_completed: t.notify.completedTitle,
  };
  const bodies: Record<string, string> = {
    order_at_church: t.notify.atChurchBody,
    order_completed: t.notify.completedBody,
  };

  const title = titles[notification.type] || notification.title;
  if (!bodies[notification.type]) {
    return { title, body: notification.body };
  }

  const hasDetails =
    Boolean(notification.payload?.listing_title) ||
    typeof notification.payload?.price_cents === "number";
  if (!hasDetails) {
    return { title, body: notification.body };
  }
  return { title, body: fill(bodies[notification.type]) };
}
