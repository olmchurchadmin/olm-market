"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  loadUserAlertsAction,
  markAllTradeNotificationsReadAction,
  markNotificationsReadAction,
} from "@/lib/actions/notifications";
import type { AlertNotification, UserAlertsData } from "@/lib/user-alerts";

const EMAIL_DISMISS_KEY = "cm_email_alert_dismissed";
const BANNER_DISMISS_KEY = "cm_trade_banner_dismissed";

type NotificationsContextValue = {
  enabled: boolean;
  loading: boolean;
  needsEmail: boolean;
  emailBannerOpen: boolean;
  tradeBannerOpen: boolean;
  unreadCount: number;
  unreadNotifications: AlertNotification[];
  recentNotifications: AlertNotification[];
  panelOpen: boolean;
  pending: boolean;
  setPanelOpen: (open: boolean) => void;
  dismissEmailBanner: () => void;
  dismissTradeBanner: () => void;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function bannerFingerprint(ids: string[]) {
  return ids.slice().sort().join(",");
}

export function NotificationsProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<UserAlertsData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [emailBannerOpen, setEmailBannerOpen] = useState(false);
  const [tradeBannerOpen, setTradeBannerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setEmailBannerOpen(false);
      setTradeBannerOpen(false);
      return;
    }
    setLoading(true);
    loadUserAlertsAction()
      .then((next) => {
        setData(next);
        if (!next) {
          setEmailBannerOpen(false);
          setTradeBannerOpen(false);
          return;
        }

        if (next.needsEmail) {
          const emailDismissed =
            sessionStorage.getItem(EMAIL_DISMISS_KEY) === "1";
          setEmailBannerOpen(!emailDismissed);
        } else {
          setEmailBannerOpen(false);
        }

        const unreadIds = next.notifications
          .filter((n) => !n.readAt)
          .map((n) => n.id);
        if (unreadIds.length) {
          const fp = bannerFingerprint(unreadIds);
          const dismissed = sessionStorage.getItem(BANNER_DISMISS_KEY) === fp;
          setTradeBannerOpen(!dismissed);
        } else {
          setTradeBannerOpen(false);
        }
      })
      .catch(() => {
        setData(null);
        setEmailBannerOpen(false);
        setTradeBannerOpen(false);
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  const unreadNotifications = useMemo(
    () => (data?.notifications || []).filter((n) => !n.readAt),
    [data],
  );
  const recentNotifications = useMemo(
    () => data?.notifications || [],
    [data],
  );
  const unreadCount = data?.unreadCount ?? unreadNotifications.length;

  function dismissEmailBanner() {
    sessionStorage.setItem(EMAIL_DISMISS_KEY, "1");
    setEmailBannerOpen(false);
  }

  function dismissTradeBanner() {
    const fp = bannerFingerprint(unreadNotifications.map((n) => n.id));
    if (fp) sessionStorage.setItem(BANNER_DISMISS_KEY, fp);
    setTradeBannerOpen(false);
  }

  function markRead(ids: string[]) {
    if (!ids.length) return;
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      const notifications = prev.notifications.map((n) =>
        ids.includes(n.id) ? { ...n, readAt: n.readAt || now } : n,
      );
      const nextUnread = notifications.filter((n) => !n.readAt).length;
      return {
        ...prev,
        notifications,
        unreadCount: nextUnread,
      };
    });
    startTransition(async () => {
      await markNotificationsReadAction(ids);
      refresh();
    });
  }

  function markAllRead() {
    setTradeBannerOpen(false);
    sessionStorage.removeItem(BANNER_DISMISS_KEY);
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || now,
        })),
      };
    });
    startTransition(async () => {
      await markAllTradeNotificationsReadAction();
      refresh();
    });
  }

  const value: NotificationsContextValue = {
    enabled,
    loading,
    needsEmail: Boolean(data?.needsEmail),
    emailBannerOpen: enabled && emailBannerOpen,
    tradeBannerOpen: enabled && tradeBannerOpen && unreadNotifications.length > 0,
    unreadCount,
    unreadNotifications,
    recentNotifications,
    panelOpen,
    pending,
    setPanelOpen,
    dismissEmailBanner,
    dismissTradeBanner,
    markRead,
    markAllRead,
    refresh,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
