"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const TOASTED_KEY = "cm_toasted_alert_ids";
const TOAST_MS = 8000;

type NotificationsContextValue = {
  enabled: boolean;
  loading: boolean;
  needsEmail: boolean;
  emailBannerOpen: boolean;
  unreadCount: number;
  unreadNotifications: AlertNotification[];
  recentNotifications: AlertNotification[];
  pending: boolean;
  markFailed: boolean;
  toast: AlertNotification | null;
  dismissEmailBanner: () => void;
  dismissToast: () => void;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function readToasted(): Set<string> {
  try {
    const raw = sessionStorage.getItem(TOASTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeToasted(ids: Set<string>) {
  try {
    // Keep the tail only; the set exists to avoid re-toasting, not as history.
    sessionStorage.setItem(TOASTED_KEY, JSON.stringify([...ids].slice(-100)));
  } catch {
    // Private mode / storage disabled — worst case a toast repeats.
  }
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
  const [markFailed, setMarkFailed] = useState(false);
  const [toast, setToast] = useState<AlertNotification | null>(null);
  const [pending, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  }, []);

  /** Toast only alerts this tab has never shown, newest first. */
  const queueToast = useCallback((next: UserAlertsData | null) => {
    if (!next) return;
    const unread = next.notifications.filter((n) => !n.readAt);
    if (!unread.length) return;

    const toasted = readToasted();
    const fresh = unread.filter((n) => !toasted.has(n.id));
    if (!fresh.length) return;

    for (const n of unread) toasted.add(n.id);
    writeToasted(toasted);

    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(fresh[0]);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const applyData = useCallback((next: UserAlertsData | null) => {
    setData(next);
    if (!next?.needsEmail) {
      setEmailBannerOpen(false);
      return;
    }
    setEmailBannerOpen(sessionStorage.getItem(EMAIL_DISMISS_KEY) !== "1");
  }, []);

  const refresh = useCallback(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setEmailBannerOpen(false);
      return;
    }
    setLoading(true);
    loadUserAlertsAction()
      .then((next) => {
        applyData(next);
        queueToast(next);
      })
      .catch(() => {
        setData(null);
        setEmailBannerOpen(false);
      })
      .finally(() => setLoading(false));
  }, [enabled, applyData, queueToast]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const unreadNotifications = useMemo(
    () => (data?.notifications || []).filter((n) => !n.readAt),
    [data],
  );
  const recentNotifications = useMemo(() => data?.notifications || [], [data]);
  const unreadCount = data?.unreadCount ?? unreadNotifications.length;

  function dismissEmailBanner() {
    sessionStorage.setItem(EMAIL_DISMISS_KEY, "1");
    setEmailBannerOpen(false);
  }

  /**
   * Marks optimistically, then replaces state with what the server actually
   * persisted. No follow-up refresh, so a re-fetch can never resurrect a
   * notification the user just confirmed.
   */
  function runMark(
    ids: string[] | null,
    action: () => Promise<
      | { ok: true; updated: number; data: UserAlertsData | null }
      | { ok: false; error: string }
    >,
  ) {
    const snapshot = data;
    setMarkFailed(false);
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      const notifications = prev.notifications.map((n) =>
        !ids || ids.includes(n.id) ? { ...n, readAt: n.readAt || now } : n,
      );
      return {
        ...prev,
        notifications,
        unreadCount: notifications.filter((n) => !n.readAt).length,
      };
    });
    if (ids && toast && ids.includes(toast.id)) dismissToast();
    if (!ids) dismissToast();

    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setData(snapshot);
        setMarkFailed(true);
        return;
      }
      if (result.data) applyData(result.data);
    });
  }

  function markRead(ids: string[]) {
    if (!ids.length) return;
    runMark(ids, () => markNotificationsReadAction(ids));
  }

  function markAllRead() {
    runMark(null, () => markAllTradeNotificationsReadAction());
  }

  const value: NotificationsContextValue = {
    enabled,
    loading,
    needsEmail: Boolean(data?.needsEmail),
    emailBannerOpen: enabled && emailBannerOpen,
    unreadCount,
    unreadNotifications,
    recentNotifications,
    pending,
    markFailed,
    toast: enabled ? toast : null,
    dismissEmailBanner,
    dismissToast,
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
