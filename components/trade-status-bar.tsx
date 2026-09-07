import { TradeStatusBarClient } from "@/components/trade-status-bar-client";
import { loadTradeDockAction } from "@/lib/actions/trade-dock";

export async function TradeStatusBar() {
  const { items, userId } = await loadTradeDockAction();
  if (!userId) return null;
  return <TradeStatusBarClient initialItems={items} userId={userId} />;
}
