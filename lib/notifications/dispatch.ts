import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmail, sendEmail } from "@/lib/notifications/email";
import { sendKakaoAlimtalk } from "@/lib/notifications/kakao";
import { formatPrice } from "@/lib/utils";

type OrderNotifyInput = {
  orderId: string;
  event: "buy" | "dropoff" | "completed";
};

function eventCopy(event: OrderNotifyInput["event"], title: string, price: number) {
  const priceLabel = formatPrice(price);
  switch (event) {
    case "buy":
      return {
        type: "order_reserved",
        title: "거래가 성립되었습니다",
        body: `「${title}」(${priceLabel}) 예약이 확정되었습니다. 판매자는 다음 주 성당에 물건을 가져와 주세요.`,
      };
    case "dropoff":
      return {
        type: "order_at_church",
        title: "물건이 성당에 도착했습니다",
        body: `「${title}」(${priceLabel}) 픽업 준비가 되었습니다. 관리자에게 현금으로 결제 후 수령해 주세요.`,
      };
    case "completed":
      return {
        type: "order_completed",
        title: "거래가 완료되었습니다",
        body: `「${title}」(${priceLabel}) 거래가 완료되었습니다.`,
      };
  }
}

async function recordJob(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    channel: "in_app" | "email" | "kakao";
    recipient: string;
    subject?: string;
    body: string;
    payload: Record<string, unknown>;
    status: "pending" | "sent" | "failed" | "skipped" | "pending_credentials";
    error?: string | null;
    related_order_id: string;
    sent_at?: string | null;
  },
) {
  await supabase.from("notification_jobs").insert(row);
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
        .select("id, title")
        .eq("id", order.listing_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, email, phone, full_name")
        .eq("id", order.buyer_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, email, phone, full_name")
        .eq("id", order.seller_id)
        .maybeSingle(),
    ]);

  const title = listing?.title || "Item";
  const copy = eventCopy(input.event, title, order.price_cents);
  const payload = {
    order_id: order.id,
    event: input.event,
    listing_title: title,
    price_cents: order.price_cents,
  };

  const recipients = [buyer, seller].filter(Boolean) as Array<{
    id: string;
    email: string | null;
    phone: string | null;
  }>;

  for (const person of recipients) {
    await supabase.from("notifications").insert({
      user_id: person.id,
      type: copy.type,
      title: copy.title,
      body: copy.body,
      payload,
    });
  }

  const emailTargets = [
    ...recipients.map((r) => r.email).filter(Boolean),
    getAdminEmail(),
  ] as string[];

  const uniqueEmails = [...new Set(emailTargets)];
  const html = `<p>${copy.body}</p><p>주문번호: ${order.id}</p>`;

  for (const email of uniqueEmails) {
    const result = await sendEmail({
      to: email,
      subject: `[Church Market] ${copy.title}`,
      html,
    });

    await recordJob(supabase, {
      channel: "email",
      recipient: email,
      subject: copy.title,
      body: copy.body,
      payload,
      status: result.ok
        ? "sent"
        : result.reason === "pending_credentials"
          ? "pending_credentials"
          : "failed",
      error: result.ok ? null : "error" in result ? result.error : result.reason,
      related_order_id: order.id,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }

  await recordJob(supabase, {
    channel: "in_app",
    recipient: getAdminEmail(),
    subject: copy.title,
    body: copy.body,
    payload,
    status: "sent",
    related_order_id: order.id,
    sent_at: new Date().toISOString(),
  });

  const phones = recipients
    .map((r) => r.phone)
    .filter((p): p is string => Boolean(p));

  if (phones.length === 0) {
    await recordJob(supabase, {
      channel: "kakao",
      recipient: "n/a",
      body: copy.body,
      payload,
      status: "skipped",
      error: "No phone numbers on profiles",
      related_order_id: order.id,
    });
    return;
  }

  for (const phone of phones) {
    const result = await sendKakaoAlimtalk({ to: phone, text: copy.body });
    await recordJob(supabase, {
      channel: "kakao",
      recipient: phone,
      body: copy.body,
      payload,
      status: result.ok
        ? "sent"
        : result.reason === "pending_credentials"
          ? "pending_credentials"
          : result.reason === "skipped"
            ? "skipped"
            : "failed",
      error: result.ok ? null : "error" in result ? result.error : result.reason,
      related_order_id: order.id,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  }
}
