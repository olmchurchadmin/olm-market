"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useI18n } from "@/components/locale-provider";
import {
  loadUserAlertsAction,
  markNotificationsReadAction,
} from "@/lib/actions/notifications";
import type { AlertNotification, UserAlertsData } from "@/lib/user-alerts";

const EMAIL_DISMISS_KEY = "cm_email_alert_dismissed";

export function UserAlertsGate() {
  const { t } = useI18n();
  const pathname = usePathname();
  const titleId = useId();
  const descId = useId();
  const [data, setData] = useState<UserAlertsData | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [queue, setQueue] = useState<AlertNotification[]>([]);
  const [pending, startTransition] = useTransition();
  const appliedKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadUserAlertsAction()
      .then((next) => {
        if (cancelled) return;
        setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!data) {
      setEmailOpen(false);
      setQueue([]);
      return;
    }

    const key = `${data.needsEmail}:${data.notifications.map((n) => n.id).join(",")}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    if (data.needsEmail) {
      const dismissed = sessionStorage.getItem(EMAIL_DISMISS_KEY) === "1";
      if (!dismissed) {
        setEmailOpen(true);
        setQueue([]);
        return;
      }
    }

    setEmailOpen(false);
    setQueue(data.notifications);
  }, [data]);

  function dismissEmailPrompt() {
    sessionStorage.setItem(EMAIL_DISMISS_KEY, "1");
    setEmailOpen(false);
    if (data?.notifications.length) {
      setQueue(data.notifications);
    }
  }

  function acknowledgeCurrent() {
    const current = queue[0];
    if (!current) return;
    const rest = queue.slice(1);
    setQueue(rest);
    startTransition(async () => {
      await markNotificationsReadAction([current.id]);
    });
  }

  const current = queue[0];
  const showTrade = !emailOpen && Boolean(current);

  if (!emailOpen && !showTrade) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(28,42,31,0.45)] p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        if (emailOpen) dismissEmailPrompt();
        else acknowledgeCurrent();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md animate-rise rounded-md border border-brand/15 bg-white p-5 shadow-[0_24px_60px_rgba(28,42,31,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        {emailOpen ? (
          <>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {t.alerts.emailRequiredTitle}
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-ink-muted">
              {t.alerts.emailRequiredBody}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={dismissEmailPrompt}
                className="rounded-md border border-brand/15 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-brand/5"
              >
                {t.alerts.later}
              </button>
              <Link
                href="/account/profile"
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-soft"
                onClick={() => sessionStorage.setItem(EMAIL_DISMISS_KEY, "1")}
              >
                {t.alerts.addEmailCta}
              </Link>
            </div>
          </>
        ) : current ? (
          <>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {current.title}
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-ink-muted">
              {current.body}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={acknowledgeCurrent}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
              >
                {t.alerts.ok}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
