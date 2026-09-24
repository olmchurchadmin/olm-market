"use client";

import { useEffect } from "react";

function detectDevice(): "desktop" | "mobile" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return "mobile";
  }
  if (
    /mobi|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(
      ua,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

/** Fire once per browser day so admin visitor stats stay accurate. */
export function VisitBeacon() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/api")) return;

    const key = "cm_visit_ping";
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    try {
      if (sessionStorage.getItem(key) === day) return;
      sessionStorage.setItem(key, day);
    } catch {
      // private mode — still attempt once this load
    }

    void fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device: detectDevice() }),
      keepalive: true,
    }).catch(() => {
      // Non-blocking analytics
    });
  }, []);

  return null;
}
