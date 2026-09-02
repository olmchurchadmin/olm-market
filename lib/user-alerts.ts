import { createClient } from "@/lib/supabase/server";
import { localizeNotification } from "@/lib/i18n/notifications";
import { getI18n } from "@/lib/i18n/server";
import type { Notification } from "@/lib/types";

export type AlertNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
};

export type UserAlertsData = {
  needsEmail: boolean;
  notifications: AlertNotification[];
};

function isKakaoUser(user: {
  app_metadata?: Record<string, unknown> | null;
  identities?: { provider?: string }[] | null;
}) {
  if (user.app_metadata?.provider === "kakao") return true;
  return Boolean(user.identities?.some((i) => i.provider === "kakao"));
}

function hasDeliverableEmail(options: {
  email: string | null;
  notificationEmail: string | null;
}) {
  const notify = options.notificationEmail?.trim();
  if (notify && notify.includes("@")) return true;
  const login = options.email?.trim();
  if (!login || !login.includes("@")) return false;
  // Kakao sometimes returns a placeholder / missing address.
  if (login.endsWith("@kakao.com") && login.startsWith("kakao_")) return false;
  return true;
}

const TRADE_TYPES = ["order_reserved", "order_at_church", "order_completed"] as const;

export async function getUserAlertsData(): Promise<UserAlertsData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, notification_email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const needsEmail =
    isKakaoUser(user) &&
    !hasDeliverableEmail({
      email: profile.email,
      notificationEmail: profile.notification_email,
    });

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, title, body, payload, read_at, created_at")
    .eq("user_id", user.id)
    .is("read_at", null)
    .in("type", [...TRADE_TYPES])
    .order("created_at", { ascending: false })
    .limit(5);

  const { locale, t } = await getI18n();
  const notifications: AlertNotification[] = (rows || []).map((row) => {
    const n = row as Notification;
    const copy = localizeNotification(
      {
        type: n.type,
        title: n.title,
        body: n.body,
        payload: n.payload as {
          listing_title?: string;
          price_cents?: number;
          event?: string;
          role?: string;
          pickup_method?: string;
          buyer_name?: string;
          seller_name?: string;
          counterparty_name?: string;
        } | null,
      },
      t,
      locale,
    );
    return {
      id: n.id,
      type: n.type,
      title: copy.title,
      body: copy.body,
    };
  });

  return { needsEmail, notifications };
}
