import type { PickupMethod } from "@/lib/types";

export type TradeDockAction = "dropoff" | "pickup" | "share_pickup" | "wait";

export type TradeDockItem = {
  orderId: string;
  role: "seller" | "buyer";
  title: string;
  priceCents: number;
  status: string;
  pickupMethod: PickupMethod;
  coverImagePath: string | null;
  listingId: string | null;
  action: TradeDockAction;
  createdAt: string;
};

type OrderRow = {
  id: string;
  status: string;
  price_cents: number;
  created_at: string;
  listings:
    | {
        id: string;
        title: string | null;
        pickup_method: string | null;
        cover_image_path: string | null;
      }
    | {
        id: string;
        title: string | null;
        pickup_method: string | null;
        cover_image_path: string | null;
      }[]
    | null;
};

function listingOf(order: OrderRow) {
  const listing = Array.isArray(order.listings)
    ? order.listings[0]
    : order.listings;
  return listing || null;
}

function sellerAction(
  status: string,
  pickupMethod: PickupMethod,
): TradeDockAction {
  if (pickupMethod === "seller_location") {
    if (status === "awaiting_dropoff" || status === "ready_for_pickup") {
      return "share_pickup";
    }
    return "wait";
  }
  if (status === "awaiting_dropoff") return "dropoff";
  return "wait";
}

function buyerAction(status: string): TradeDockAction {
  if (status === "awaiting_dropoff" || status === "ready_for_pickup") {
    return "pickup";
  }
  return "wait";
}

function actionPriority(action: TradeDockAction) {
  switch (action) {
    case "dropoff":
    case "pickup":
      return 0;
    case "share_pickup":
      return 1;
    default:
      return 2;
  }
}

export function buildTradeDockItems(input: {
  sellingOrders: OrderRow[] | null | undefined;
  buyingOrders: OrderRow[] | null | undefined;
}): TradeDockItem[] {
  const items: TradeDockItem[] = [];

  for (const order of input.sellingOrders || []) {
    const listing = listingOf(order);
    const pickupMethod =
      listing?.pickup_method === "seller_location"
        ? "seller_location"
        : "church";
    items.push({
      orderId: order.id,
      role: "seller",
      title: listing?.title?.trim() || "Item",
      priceCents: order.price_cents,
      status: order.status,
      pickupMethod,
      coverImagePath: listing?.cover_image_path || null,
      listingId: listing?.id || null,
      action: sellerAction(order.status, pickupMethod),
      createdAt: order.created_at,
    });
  }

  for (const order of input.buyingOrders || []) {
    const listing = listingOf(order);
    const pickupMethod =
      listing?.pickup_method === "seller_location"
        ? "seller_location"
        : "church";
    items.push({
      orderId: order.id,
      role: "buyer",
      title: listing?.title?.trim() || "Item",
      priceCents: order.price_cents,
      status: order.status,
      pickupMethod,
      coverImagePath: listing?.cover_image_path || null,
      listingId: listing?.id || null,
      action: buyerAction(order.status),
      createdAt: order.created_at,
    });
  }

  items.sort((a, b) => {
    const byAction = actionPriority(a.action) - actionPriority(b.action);
    if (byAction !== 0) return byAction;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return items;
}
