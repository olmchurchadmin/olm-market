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
  order_id?: string;
  listing_id?: string;
  pickup_note?: string;
  pickup_contact?: string;
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

  if (notification.type === "order_at_church") {
    return {
      title:
        role === "seller" ? t.notify.atChurchSellerTitle : t.notify.atChurchTitle,
      body: fill(
        role === "seller" ? t.notify.atChurchSellerBody : t.notify.atChurchBody,
      ),
      details,
    };
  }

  if (notification.type === "order_pickup_details") {
    const note = notification.payload?.pickup_note?.trim();
    const contact = notification.payload?.pickup_contact?.trim();
    if (role === "seller") {
      return {
        title: t.notify.pickupDetailsSellerTitle,
        body: fill(t.notify.pickupDetailsSellerBody),
        details,
      };
    }
    const lines = [fill(t.notify.pickupDetailsBuyerBody)];
    if (note) lines.push(note);
    if (contact) lines.push(`${t.notify.pickupContactLabel}: ${contact}`);
    return {
      title: t.notify.pickupDetailsBuyerTitle,
      body: lines.join("\n"),
      details,
    };
  }

  if (notification.type === "order_completed") {
    const home = notification.payload?.pickup_method === "seller_location";
    if (role === "seller") {
      return {
        title: t.notify.completedTitle,
        body: fill(
          home
            ? t.notify.completedSellerHomeBody
            : t.notify.completedSellerChurchBody,
        ),
        details,
      };
    }
    if (role === "buyer") {
      return {
        title: t.notify.completedTitle,
        body: fill(t.notify.completedBuyerBody),
        details,
      };
    }
    return { title: t.notify.completedTitle, body: fill(t.notify.completedBody), details };
  }

  // Unknown type — show whatever the dispatcher stored.
  return { title: notification.title, body: notification.body, details };
}
