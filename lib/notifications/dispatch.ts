import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmail, sendEmail } from "@/lib/notifications/email";
import { tradeNotificationEmailHtml } from "@/lib/notifications/trade-emails";
import { formatPersonName, formatPrice } from "@/lib/utils";
import type { PickupMethod } from "@/lib/types";

type OrderNotifyInput = {
  orderId: string;
  event: "buy" | "dropoff" | "completed";
};

type ProfileRow = {
  id: string;
  email: string | null;
  notification_email: string | null;
  full_name: string | null;
  nickname: string | null;
};

type MessageCopy = {
  type: string;
  title: string;
  body: string;
  role?: "buyer" | "seller" | "admin";
};

function displayName(
  profile: Pick<ProfileRow, "nickname" | "full_name" | "email"> | null | undefined,
  fallback: string,
) {
  return formatPersonName(profile, fallback);
}

function notifyEmailFor(person: ProfileRow): string | null {
  const notify = person.notification_email?.trim();
  if (notify) return notify;
  const login = person.email?.trim();
  return login || null;
}

function buyCopies(options: {
  title: string;
  priceCents: number;
  pickupMethod: PickupMethod;
  buyerName: string;
  sellerName: string;
  pickupAddress?: string;
  pickupPhone?: string;
}) {
  const priceLabel = formatPrice(options.priceCents);
  const item = `「${options.title}」(${priceLabel})`;
  const church = options.pickupMethod !== "seller_location";
  const address = options.pickupAddress?.trim() || "";
  const phone = options.pickupPhone?.trim() || "";
  const hasPickupDetails = Boolean(address || phone);

  const buyerHomeLines = [
    `${item} 거래가 성립되었습니다. 판매자(${options.sellerName}) 집에서 픽업하는 거래입니다.`,
    hasPickupDetails
      ? "아래 주소와 연락처로 연락해 날짜와 시간을 정하고, 물건을 받을 때 현금으로 결제해 주세요."
      : "판매자가 픽업 주소와 연락처를 보내드리면 알림으로 확인하실 수 있습니다.",
    address,
    phone ? `연락처: ${phone}` : "",
  ].filter(Boolean);

  return {
    seller: {
      type: "order_reserved",
      title: church ? "팔렸습니다" : "팔렸습니다 · 집에서 픽업",
      body: church
        ? `${item}이 팔렸습니다. 구매자는 ${options.buyerName}입니다. 다음 주 성당으로 가져와 주세요.`
        : hasPickupDetails
          ? `${item}이 팔렸습니다. 구매자(${options.buyerName})가 집으로 픽업하러 옵니다. 등록하신 픽업 주소와 연락처가 구매자에게 전달되었습니다.`
          : `${item}이 팔렸습니다. 구매자(${options.buyerName})가 집으로 픽업하러 옵니다. 내 계정 › 거래 내역에서 픽업 주소와 연락처를 구매자에게 보내 주세요.`,
      role: "seller" as const,
    },
    buyer: {
      type: "order_reserved",
      title: church
        ? "거래가 성립되었습니다"
        : "거래가 성립되었습니다 · 집에서 픽업",
      body: church
        ? `${item} 거래가 성립되었습니다. 판매자(${options.sellerName})가 물건을 성당에 맡기면 다시 알려드립니다. 그때 성당에서 현금으로 결제하고 수령하세요.`
        : buyerHomeLines.join("\n"),
      role: "buyer" as const,
    },
  };
}

/** Drop-off and completion read differently for each side, and church pickup
 *  and home pickup are different journeys, so copy is split four ways. */
function eventCopies(options: {
  event: "dropoff" | "completed";
  title: string;
  priceCents: number;
  pickupMethod: PickupMethod;
  buyerName: string;
  sellerName: string;
}) {
  const priceLabel = formatPrice(options.priceCents);
  const item = `「${options.title}」(${priceLabel})`;
  const church = options.pickupMethod !== "seller_location";

  if (options.event === "dropoff") {
    return {
      seller: {
        type: "order_at_church",
        title: "성당 접수가 확인되었습니다",
        body: `관리자가 ${item} 접수를 확인했습니다. 구매자(${options.buyerName})가 성당에서 수령하면 거래가 완료됩니다.`,
        role: "seller" as const,
      },
      buyer: {
        type: "order_at_church",
        title: "물건이 성당에 도착했습니다",
        body: `판매자(${options.sellerName})가 맡긴 ${item}이 성당에 도착했습니다. 관리자에게 현금으로 결제한 뒤 수령해 주세요.`,
        role: "buyer" as const,
      },
    };
  }

  return {
    seller: {
      type: "order_completed",
      title: "거래가 완료되었습니다",
      body: church
        ? `구매자(${options.buyerName})가 ${item}을 성당에서 수령했습니다. 판매 대금은 관리자를 통해 정산됩니다.`
        : `구매자(${options.buyerName})가 ${item}을 집에서 픽업했고 관리자가 거래를 완료 처리했습니다.`,
      role: "seller" as const,
    },
    buyer: {
      type: "order_completed",
      title: "거래가 완료되었습니다",
      body: `판매자(${options.sellerName})와의 ${item} 거래가 완료되었습니다. 이용해 주셔서 감사합니다.`,
      role: "buyer" as const,
    },
  };
}

function pickupLabelKo(method: PickupMethod) {
  return method === "seller_location" ? "판매자 집 픽업" : "성당 픽업";
}

async function recordJob(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    channel: "in_app" | "email";
    recipient: string;
    subject?: string;
    body: string;
    payload: Record<string, unknown>;
    status: "pending" | "sent" | "failed" | "skipped" | "pending_credentials";
    error?: string | null;
    related_order_id?: string | null;
    sent_at?: string | null;
  },
) {
  await supabase.from("notification_jobs").insert(row);
}

async function deliverEmail(
  supabase: ReturnType<typeof createServiceClient>,
  person: ProfileRow,
  copy: MessageCopy,
  payload: Record<string, unknown>,
  orderId: string | null,
) {
  const to = notifyEmailFor(person);
  if (!to) {
    await recordJob(supabase, {
      channel: "email",
      recipient: person.id,
      subject: copy.title,
      body: copy.body,
      payload,
      status: "skipped",
      error: "No notification email on profile",
      related_order_id: orderId,
    });
    return;
  }

  const listingId =
    typeof payload.listing_id === "string" ? payload.listing_id : null;
  const role = typeof payload.role === "string" ? payload.role : null;

  const result = await sendEmail({
    to,
    subject: `[OLM Market] ${copy.title}`,
    html: tradeNotificationEmailHtml({
      title: copy.title,
      body: copy.body,
      orderId,
      listingId,
      role,
    }),
  });
  await recordJob(supabase, {
    channel: "email",
    recipient: to,
    subject: copy.title,
    body: copy.body,
    payload,
    status: result.ok
      ? "sent"
      : result.reason === "pending_credentials"
        ? "pending_credentials"
        : "failed",
    error: result.ok ? null : "error" in result ? result.error : result.reason,
    related_order_id: orderId,
    sent_at: result.ok ? new Date().toISOString() : null,
  });
}

async function deliverToPerson(
  supabase: ReturnType<typeof createServiceClient>,
  options: {
    person: ProfileRow;
    copy: MessageCopy;
    payload: Record<string, unknown>;
    orderId: string | null;
  },
) {
  const { person, copy, payload, orderId } = options;

  await supabase.from("notifications").insert({
    user_id: person.id,
    type: copy.type,
    title: copy.title,
    body: copy.body,
    payload,
  });

  await deliverEmail(supabase, person, copy, payload, orderId);
}

/**
 * The admin is not a party to the trade, so they get one digest covering both
 * sides by email rather than in-app rows. Their working view is /admin.
 */
async function notifyAdmin(
  supabase: ReturnType<typeof createServiceClient>,
  options: {
    subject: string;
    lines: string[];
    payload: Record<string, unknown>;
    orderId: string | null;
  },
) {
  const adminEmail = getAdminEmail();
  const body = options.lines.join("\n\n");
  const html = tradeNotificationEmailHtml({
    title: options.subject,
    body,
    orderId: options.orderId,
    listingId:
      typeof options.payload.listing_id === "string"
        ? options.payload.listing_id
        : null,
    role: "admin",
  });

  const result = await sendEmail({
    to: adminEmail,
    subject: `[OLM Market] ${options.subject}`,
    html,
  });

  await recordJob(supabase, {
    channel: "email",
    recipient: adminEmail,
    subject: options.subject,
    body,
    payload: options.payload,
    status: result.ok
      ? "sent"
      : result.reason === "pending_credentials"
        ? "pending_credentials"
        : "failed",
    error: result.ok ? null : "error" in result ? result.error : result.reason,
    related_order_id: options.orderId,
    sent_at: result.ok ? new Date().toISOString() : null,
  });
}

const profileSelect = "id, email, notification_email, full_name, nickname";

export async function notifyListingCreated(listingId: string) {
  const supabase = createServiceClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, price_cents, seller_id")
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    throw new Error(error?.message || "Listing not found for notification");
  }

  const { data: seller } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", listing.seller_id)
    .maybeSingle();

  if (!seller) {
    throw new Error("Seller profile missing for listing notification");
  }

  const priceLabel = formatPrice(listing.price_cents);
  const copy: MessageCopy = {
    type: "listing_created",
    title: "물품이 등록되었습니다",
    body: `「${listing.title}」(${priceLabel})이 장터에 등록되었습니다.`,
    role: "seller",
  };

  const payload = {
    event: "listing_created",
    listing_id: listing.id,
    listing_title: listing.title,
    price_cents: listing.price_cents,
    role: "seller",
  };

  await deliverToPerson(supabase, {
    person: seller,
    copy,
    payload,
    orderId: null,
  });
}

export async function notifyOrderEvent(input: OrderNotifyInput) {
  const supabase = createServiceClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, price_cents, buyer_id, seller_id, listing_id")
    .eq("id", input.orderId)
    .single();

  if (error || !order) {
    throw new Error(error?.message || "Order not found for notification");
  }

  const [{ data: listing }, { data: buyer }, { data: seller }, { data: pickupContact }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, title, pickup_method")
        .eq("id", order.listing_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", order.buyer_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", order.seller_id)
        .maybeSingle(),
      supabase
        .from("listing_pickup_contacts")
        .select("address, phone")
        .eq("listing_id", order.listing_id)
        .maybeSingle(),
    ]);

  const title = listing?.title || "Item";
  const pickupMethod: PickupMethod =
    listing?.pickup_method === "seller_location" ? "seller_location" : "church";
  const buyerName = displayName(buyer, "구매자");
  const sellerName = displayName(seller, "판매자");
  const pickupAddress =
    pickupMethod === "seller_location" ? pickupContact?.address?.trim() || "" : "";
  const pickupPhone =
    pickupMethod === "seller_location" ? pickupContact?.phone?.trim() || "" : "";

  if (input.event === "buy") {
    if (!buyer || !seller) {
      throw new Error("Buyer or seller profile missing for notification");
    }

    const copies = buyCopies({
      title,
      priceCents: order.price_cents,
      pickupMethod,
      buyerName,
      sellerName,
      pickupAddress,
      pickupPhone,
    });

    const basePayload = {
      order_id: order.id,
      event: input.event,
      listing_title: title,
      price_cents: order.price_cents,
      pickup_method: pickupMethod,
      buyer_name: buyerName,
      seller_name: sellerName,
      ...(pickupAddress ? { pickup_note: pickupAddress } : {}),
      ...(pickupPhone ? { pickup_contact: pickupPhone } : {}),
    };

    await deliverToPerson(supabase, {
      person: seller,
      copy: copies.seller,
      payload: { ...basePayload, role: "seller", counterparty_name: buyerName },
      orderId: order.id,
    });

    await deliverToPerson(supabase, {
      person: buyer,
      copy: copies.buyer,
      payload: { ...basePayload, role: "buyer", counterparty_name: sellerName },
      orderId: order.id,
    });

    await notifyAdmin(supabase, {
      subject: `거래 성립 · ${title}`,
      lines: [
        `${pickupLabelKo(pickupMethod)} 거래가 성립되었습니다.`,
        `판매자(${sellerName}) 안내: ${copies.seller.body}`,
        `구매자(${buyerName}) 안내: ${copies.buyer.body}`,
        pickupMethod === "seller_location"
          ? "집 픽업 거래입니다. 성당 드롭오프 없이 관리자 페이지에서 「거래 완료 확인」으로 마감해 주세요."
          : "판매자가 성당에 물건을 맡기면 관리자 페이지에서 「드롭오프 확인」을 눌러 주세요.",
      ],
      payload: { ...basePayload, role: "admin" },
      orderId: order.id,
    });

    return;
  }

  const copies = eventCopies({
    event: input.event,
    title,
    priceCents: order.price_cents,
    pickupMethod,
    buyerName,
    sellerName,
  });

  const payload = {
    order_id: order.id,
    event: input.event,
    listing_title: title,
    price_cents: order.price_cents,
    pickup_method: pickupMethod,
    buyer_name: buyerName,
    seller_name: sellerName,
  };

  const recipients = [buyer, seller].filter(Boolean) as ProfileRow[];
  for (const person of recipients) {
    const role = person.id === order.buyer_id ? "buyer" : "seller";
    await deliverToPerson(supabase, {
      person,
      copy: role === "buyer" ? copies.buyer : copies.seller,
      payload: {
        ...payload,
        role,
        counterparty_name: role === "buyer" ? sellerName : buyerName,
      },
      orderId: order.id,
    });
  }

  await notifyAdmin(supabase, {
    subject:
      input.event === "dropoff" ? `성당 접수 · ${title}` : `거래 완료 · ${title}`,
    lines: [
      `${pickupLabelKo(pickupMethod)} 거래입니다.`,
      `판매자(${sellerName}) 안내: ${copies.seller.body}`,
      `구매자(${buyerName}) 안내: ${copies.buyer.body}`,
    ],
    payload: { ...payload, role: "admin" },
    orderId: order.id,
  });
}

/**
 * Sends the seller's pickup address and contact to the buyer for home-pickup
 * trades, and confirms to the seller that it went out.
 */
export async function notifyPickupDetails(input: {
  orderId: string;
  note: string;
  contact: string;
}) {
  const supabase = createServiceClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, price_cents, buyer_id, seller_id, listing_id")
    .eq("id", input.orderId)
    .single();

  if (error || !order) {
    throw new Error(error?.message || "Order not found for pickup details");
  }

  const [{ data: listing }, { data: buyer }, { data: seller }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, title, pickup_method")
        .eq("id", order.listing_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", order.buyer_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", order.seller_id)
        .maybeSingle(),
    ]);

  if (!buyer || !seller) {
    throw new Error("Buyer or seller profile missing for pickup details");
  }

  const title = listing?.title || "Item";
  const buyerName = displayName(buyer, "구매자");
  const sellerName = displayName(seller, "판매자");
  const priceLabel = formatPrice(order.price_cents);
  const item = `「${title}」(${priceLabel})`;

  const basePayload = {
    order_id: order.id,
    event: "pickup_details",
    listing_title: title,
    price_cents: order.price_cents,
    pickup_method: "seller_location" as PickupMethod,
    buyer_name: buyerName,
    seller_name: sellerName,
    pickup_note: input.note,
    pickup_contact: input.contact,
  };

  const buyerLines = [
    `판매자(${sellerName})가 ${item} 픽업 주소와 연락처를 보냈습니다. 연락해서 날짜와 시간을 정하고, 물건을 받을 때 현금으로 결제해 주세요.`,
    input.note,
    input.contact ? `연락처: ${input.contact}` : "",
  ].filter(Boolean);

  await deliverToPerson(supabase, {
    person: buyer,
    copy: {
      type: "order_pickup_details",
      title: "판매자가 픽업 정보를 보냈습니다",
      body: buyerLines.join("\n"),
      role: "buyer",
    },
    payload: { ...basePayload, role: "buyer", counterparty_name: sellerName },
    orderId: order.id,
  });

  await deliverToPerson(supabase, {
    person: seller,
    copy: {
      type: "order_pickup_details",
      title: "픽업 정보를 보냈습니다",
      body: `구매자(${buyerName})에게 ${item} 픽업 주소와 연락처를 전달했습니다. 구매자가 연락하면 날짜와 시간을 정해 주세요.`,
      role: "seller",
    },
    payload: { ...basePayload, role: "seller", counterparty_name: buyerName },
    orderId: order.id,
  });

  await notifyAdmin(supabase, {
    subject: `픽업 정보 전달 · ${title}`,
    lines: [
      `집 픽업 거래에서 판매자(${sellerName})가 구매자(${buyerName})에게 픽업 정보를 전달했습니다.`,
      `물건: ${item}`,
      `픽업 안내: ${input.note}`,
      input.contact ? `연락처: ${input.contact}` : "",
      "픽업이 끝나면 관리자 페이지에서 「거래 완료 확인」을 눌러 주세요.",
    ].filter(Boolean),
    payload: { ...basePayload, role: "admin" },
    orderId: order.id,
  });
}
