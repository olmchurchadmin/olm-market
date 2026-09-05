/** Client-safe routes for alert "확인" actions. */

export function notificationActionHref(
  type: string | null | undefined,
  payloadEvent?: string | null,
  listingId?: string | null,
): string | null {
  const key = (type || payloadEvent || "").trim();
  if (key === "complaint_new" || key === "complaint_reply") {
    return "/account/complaints";
  }
  if (key === "listing_admin_updated") {
    return listingId ? `/market/${listingId}` : "/account/transactions";
  }
  if (key === "listing_admin_deleted") {
    return "/account/transactions";
  }
  return null;
}
