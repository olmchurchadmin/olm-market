import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmail, sendEmail } from "@/lib/notifications/email";
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
}) {
  const priceLabel = formatPrice(options.priceCents);
  const item = `「${options.title}」(${priceLabel})`;
  const church = options.pickupMethod !== "seller_location";

  return {
    seller: {
      type: "order_reserved",
      title: "팔렸습니다",
      body: church
        ? `${item}이 팔렸습니다. 구매자는 ${options.buyerName}입니다. 다음 주 성당으로 가져와 주세요.`
        : `${item}이 팔렸습니다. 구매자는 ${options.buyerName}입니다. 집으로 픽업하러 옵니다. 구매자와 상의하여 날짜와 시간을 정하세요.`,
      role: "seller" as const,
    },
    buyer: {
      type: "order_reserved",
      title: "거래가 성립되었습니다",
      body: church
        ? `${item} 거래가 성립되었습니다. 다음 주 성당에서 판매자(${options.sellerName})를 찾아 물건을 전달받으세요.`
        : `${item} 거래가 성립되었습니다. 판매자(${options.sellerName})와 상의하여 날짜와 시간을 정하세요.`,
      role: "buyer" as const,
    },
  };
}

function sharedEventCopy(
  event: "dropoff" | "completed",
  title: string,
  priceCents: number,
): MessageCopy {
  const priceLabel = formatPrice(priceCents);
  if (event === "dropoff") {
    return {
      type: "order_at_church",
      title: "물건이 성당에 도착했습니다",
      body: `「${title}」(${priceLabel}) 픽업 준비가 되었습니다. 관리자에게 현금으로 결제 후 수령해 주세요.`,
    };
  }
  return {
    type: "order_completed",
    title: "거래가 완료되었습니다",
    body: `「${title}」(${priceLabel}) 거래가 완료되었습니다.`,
  };
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

  const footer = orderId
    ? `<p>주문번호: ${orderId}</p>`
    : payload.listing_id
      ? `<p>물품 ID: ${payload.listing_id}</p>`
      : "";

  const result = await sendEmail({
    to,
    subject: `[OLM Market] ${copy.title}`,
    html: `<p>${copy.body}</p>${footer}`,
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

  const title = listing?.title || "Item";
  const pickupMethod: PickupMethod =
    listing?.pickup_method === "seller_location" ? "seller_location" : "church";
  const buyerName = displayName(buyer, "구매자");
  const sellerName = displayName(seller, "판매자");

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
    });

    const basePayload = {
      order_id: order.id,
      event: input.event,
      listing_title: title,
      price_cents: order.price_cents,
      pickup_method: pickupMethod,
      buyer_name: buyerName,
      seller_name: sellerName,
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

    const adminSummary = `${copies.seller.body}\n\n${copies.buyer.body}`;
    const adminEmail = getAdminEmail();
    const adminResult = await sendEmail({
      to: adminEmail,
      subject: `[OLM Market] 거래 성립 · ${title}`,
      html: `<p>${copies.seller.body}</p><p>${copies.buyer.body}</p><p>주문번호: ${order.id}</p>`,
    });
    await recordJob(supabase, {
      channel: "email",
      recipient: adminEmail,
      subject: `거래 성립 · ${title}`,
      body: adminSummary,
      payload: { ...basePayload, role: "admin" },
      status: adminResult.ok
        ? "sent"
        : adminResult.reason === "pending_credentials"
          ? "pending_credentials"
          : "failed",
      error: adminResult.ok
        ? null
        : "error" in adminResult
          ? adminResult.error
          : adminResult.reason,
      related_order_id: order.id,
      sent_at: adminResult.ok ? new Date().toISOString() : null,
    });

    return;
  }

  const copy = sharedEventCopy(input.event, title, order.price_cents);
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
      copy: { ...copy, role },
      payload: {
        ...payload,
        role,
        counterparty_name: role === "buyer" ? sellerName : buyerName,
      },
      orderId: order.id,
    });
  }

  const adminEmail = getAdminEmail();
  const adminResult = await sendEmail({
    to: adminEmail,
    subject: `[OLM Market] ${copy.title}`,
    html: `<p>${copy.body}</p><p>주문번호: ${order.id}</p>`,
  });
  await recordJob(supabase, {
    channel: "email",
    recipient: adminEmail,
    subject: copy.title,
    body: copy.body,
    payload: { ...payload, role: "admin" },
    status: adminResult.ok
      ? "sent"
      : adminResult.reason === "pending_credentials"
        ? "pending_credentials"
        : "failed",
    error: adminResult.ok
      ? null
      : "error" in adminResult
        ? adminResult.error
        : adminResult.reason,
    related_order_id: order.id,
    sent_at: adminResult.ok ? new Date().toISOString() : null,
  });
}
