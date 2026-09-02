import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/utils";

export type NotificationPayload = {
  listing_title?: string;
  price_cents?: number;
  event?: string;
  role?: string;
  pickup_method?: string;
  buyer_name?: string;
  seller_name?: string;
  counterparty_name?: string;
} | null;

type NotificationLike = {
  type: string;
  title: string;
  body: string;
  payload?: NotificationPayload;
};

export type NotificationDetails = {
  item: string | null;
  price: string | null;
  seller: string | null;
  buyer: string | null;
  pickup: string | null;
};

export type LocalizedNotification = {
  title: string;
  body: string;
  details: NotificationDetails;
};

function pickupLabel(
  method: string | undefined,
  t: Dictionary,
): string | null {
  if (!method) return null;
  if (method === "seller_location") return t.market.pickupSeller;
  if (method === "church") return t.market.pickupChurch;
  return null;
}

export function localizeNotification(
  notification: NotificationLike,
  t: Dictionary,
  locale: string,
): LocalizedNotification {
  const itemTitle = notification.payload?.listing_title || null;
  const price =
    typeof notification.payload?.price_cents === "number"
      ? formatPrice(notification.payload.price_cents, locale)
      : null;
  const buyer = notification.payload?.buyer_name?.trim() || null;
  const seller = notification.payload?.seller_name?.trim() || null;
  const pickup = pickupLabel(notification.payload?.pickup_method, t);

  // Fallbacks when only counterparty was stored (older payloads).
  const role = notification.payload?.role;
  const counterparty = notification.payload?.counterparty_name?.trim() || null;
  const resolvedBuyer =
    buyer || (role === "seller" ? counterparty : null) || null;
  const resolvedSeller =
    seller || (role === "buyer" ? counterparty : null) || null;

  const details: NotificationDetails = {
    item: itemTitle,
    price,
    seller: resolvedSeller,
    buyer: resolvedBuyer,
    pickup,
  };

  const fillTitle = itemTitle || t.account.item;
  const fillPrice = price || formatPrice(0, locale);
  const fillBuyer = resolvedBuyer || t.notify.buyerLabel;
  const fillSeller = resolvedSeller || t.notify.sellerLabel;

  const fill = (template: string) =>
    template
      .replaceAll("{title}", fillTitle)
      .replaceAll("{price}", fillPrice)
      .replaceAll("{buyer}", fillBuyer)
      .replaceAll("{seller}", fillSeller);

  if (notification.type === "order_reserved") {
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
        details,
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
        details,
      };
    }

    return {
      title: t.notify.reservedTitle,
      body: fill(t.notify.reservedBody),
      details,
    };
  }

  if (notification.type === "listing_created") {
    return {
      title: t.notify.listingCreatedTitle,
      body: fill(t.notify.listingCreatedBody),
      details,
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
    return { title, body: notification.body, details };
  }

  const hasDetails =
    Boolean(notification.payload?.listing_title) ||
    typeof notification.payload?.price_cents === "number";
  if (!hasDetails) {
    return { title, body: notification.body, details };
  }
  return { title, body: fill(bodies[notification.type]), details };
}
