import type { NotificationPayload } from "@/lib/i18n/notifications";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatListingPublicId, formatPrice } from "@/lib/utils";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
};

export type NotificationGroup = {
  key: string;
  kind: "order" | "listing" | "complaint" | "single";
  orderId: string | null;
  listingId: string | null;
  publicListingId: string | null;
  itemTitle: string | null;
  priceLabel: string | null;
  statusKey:
    | "completed"
    | "at_church"
    | "reserved"
    | "pickup_details"
    | "other";
  latestAt: string;
  hasUnread: boolean;
  items: NotificationRow[];
};

const TRADE_STATUS_RANK: Record<string, number> = {
  order_completed: 40,
  order_at_church: 30,
  order_pickup_details: 25,
  order_reserved: 20,
};

function payloadOf(n: NotificationRow): NonNullable<NotificationPayload> {
  return (n.payload || {}) as NonNullable<NotificationPayload>;
}

export function groupNotifications(
  rows: NotificationRow[],
  listingIdByOrderId: Map<string, string>,
  locale: string,
): NotificationGroup[] {
  const buckets = new Map<string, NotificationRow[]>();

  for (const row of rows) {
    const p = payloadOf(row);
    let key: string;
    if (p.order_id) {
      key = `order:${p.order_id}`;
    } else if (p.complaint_id) {
      key = `complaint:${p.complaint_id}`;
    } else if (p.listing_id) {
      key = `listing:${p.listing_id}`;
    } else {
      key = `single:${row.id}`;
    }
    const list = buckets.get(key) || [];
    list.push(row);
    buckets.set(key, list);
  }

  const groups: NotificationGroup[] = [];

  for (const [key, items] of buckets) {
    items.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const latest = items[items.length - 1]!;
    const sample = items.find((n) => payloadOf(n).listing_title) || latest;
    const p = payloadOf(sample);

    let kind: NotificationGroup["kind"] = "single";
    let orderId: string | null = p.order_id || null;
    let listingId: string | null = p.listing_id || null;

    if (key.startsWith("order:")) {
      kind = "order";
      orderId = key.slice(6);
      listingId =
        listingId || listingIdByOrderId.get(orderId) || null;
    } else if (key.startsWith("listing:")) {
      kind = "listing";
      listingId = key.slice(8);
    } else if (key.startsWith("complaint:")) {
      kind = "complaint";
    }

    let statusKey: NotificationGroup["statusKey"] = "other";
    let bestRank = -1;
    for (const item of items) {
      const rank = TRADE_STATUS_RANK[item.type] ?? -1;
      if (rank > bestRank) {
        bestRank = rank;
        if (item.type === "order_completed") statusKey = "completed";
        else if (item.type === "order_at_church") statusKey = "at_church";
        else if (item.type === "order_pickup_details")
          statusKey = "pickup_details";
        else if (item.type === "order_reserved") statusKey = "reserved";
      }
    }

    groups.push({
      key,
      kind,
      orderId,
      listingId,
      publicListingId: listingId ? formatListingPublicId(listingId) : null,
      itemTitle: p.listing_title?.trim() || p.complaint_subject?.trim() || null,
      priceLabel:
        typeof p.price_cents === "number"
          ? formatPrice(p.price_cents, locale)
          : null,
      statusKey,
      latestAt: latest.created_at,
      hasUnread: items.some((n) => !n.read_at),
      items,
    });
  }

  groups.sort(
    (a, b) =>
      new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );

  return groups;
}

export function notificationGroupStatusLabel(
  statusKey: NotificationGroup["statusKey"],
  t: Dictionary,
) {
  switch (statusKey) {
    case "completed":
      return t.status.completed;
    case "at_church":
      return t.status.ready_for_pickup;
    case "reserved":
      return t.account.notificationTrackReserved;
    case "pickup_details":
      return t.account.notificationStatusPickupDetails;
    default:
      return t.account.notificationStatusOther;
  }
}

export type TradeTrackStep = {
  key: "reserved" | "middle" | "completed";
  label: string;
  done: boolean;
  current: boolean;
};

export function tradeTrackSteps(
  group: NotificationGroup,
  t: Dictionary,
): TradeTrackStep[] | null {
  if (group.kind !== "order") return null;

  const types = new Set(group.items.map((n) => n.type));
  const homePickup = group.items.some(
    (n) => payloadOf(n).pickup_method === "seller_location",
  );
  const reservedDone = types.has("order_reserved");
  const middleDone = homePickup
    ? types.has("order_pickup_details")
    : types.has("order_at_church");
  const completedDone = types.has("order_completed");

  const base: Omit<TradeTrackStep, "current">[] = [
    {
      key: "reserved",
      label: t.account.notificationTrackReserved,
      done: reservedDone,
    },
    {
      key: "middle",
      label: homePickup
        ? t.account.notificationTrackPickupDetails
        : t.account.notificationTrackAtChurch,
      done: middleDone,
    },
    {
      key: "completed",
      label: t.account.notificationTrackCompleted,
      done: completedDone,
    },
  ];

  const currentIndex = completedDone
    ? base.length - 1
    : base.findIndex((step) => !step.done);

  return base.map((step, index) => ({
    ...step,
    current: index === (currentIndex < 0 ? base.length - 1 : currentIndex),
  }));
}
