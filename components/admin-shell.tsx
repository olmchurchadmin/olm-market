"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";

export function AdminShell({
  active,
  openComplaints = 0,
  activeTrades = 0,
  children,
}: {
  active: AdminTab;
  openComplaints?: number;
  activeTrades?: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<AdminTab | null>(null);

  useEffect(() => {
    setPendingTab(null);
  }, [active]);

  const navigate = useCallback(
    (tab: AdminTab) => {
      if (tab === active && !pendingTab) return;
      setPendingTab(tab);
      startTransition(() => {
        router.push(`/admin?tab=${tab}`);
      });
    },
    [active, pendingTab, router],
  );

  const displayActive = pendingTab ?? active;

  return (
    <>
      <AdminTabs
        active={active}
        displayActive={displayActive}
        pending={pending}
        openComplaints={openComplaints}
        activeTrades={activeTrades}
        onNavigate={navigate}
      />
      <div
        className={`transition-opacity duration-150 ${
          pending ? "pointer-events-none opacity-50" : "opacity-100"
        }`}
        aria-busy={pending || undefined}
      >
        {children}
      </div>
    </>
  );
}
