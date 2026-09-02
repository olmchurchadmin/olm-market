import type { Profile, PublicSeller } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function formatPrice(cents: number, _locale = "ko") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Label shown in the signed-in user's own menu (never anonymized). */
export function accountDisplayName(
  profile: Pick<Profile, "nickname" | "full_name" | "email">,
  fallback = "Member",
) {
  return profile.nickname || profile.full_name || profile.email || fallback;
}

/** Public seller label on market cards/detail. Honors is_anonymous. */
export function publicSellerLabel(
  seller: PublicSeller | PublicSeller[] | null | undefined,
  labels?: { seller: string; anonymous: string },
) {
  const row = Array.isArray(seller) ? seller[0] : seller;
  const sellerLabel = labels?.seller || "Seller";
  const anonymousLabel = labels?.anonymous || "Anonymous";
  if (!row) return sellerLabel;
  if (row.is_anonymous) return anonymousLabel;
  return row.nickname || row.full_name || sellerLabel;
}

export function listingImageUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/listing-images/${path}`;
}

export function listingStatusLabel(
  status: string,
  dict?: Dictionary["status"],
) {
  if (dict && status in dict) {
    return dict[status as keyof Dictionary["status"]];
  }
  switch (status) {
    case "available":
      return "판매중";
    case "reserved":
      return "예약됨";
    case "at_church":
      return "성당 보관중";
    case "sold":
      return "판매완료";
    case "cancelled":
      return "취소";
    default:
      return status;
  }
}

export function listingStatusBadgeClass(status: string) {
  switch (status) {
    case "reserved":
      return "bg-amber-600 text-white";
    case "at_church":
      return "bg-teal-700 text-white";
    case "sold":
      return "bg-neutral-600 text-white";
    default:
      return "bg-brand text-white";
  }
}

/** Short public posting id derived from the listing UUID (first 8 hex chars). */
export function formatListingPublicId(id: string) {
  const hex = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return hex || id.slice(0, 8).toUpperCase();
}

export function orderStatusLabel(status: string, dict?: Dictionary["status"]) {
  if (status === "reserved" || status === "awaiting_dropoff") {
    return dict?.awaiting_dropoff || "드롭오프 대기";
  }
  if (dict && status in dict) {
    return dict[status as keyof Dictionary["status"]];
  }
  switch (status) {
    case "ready_for_pickup":
      return "픽업 대기";
    case "completed":
      return "거래 완료";
    case "cancelled":
      return "취소";
    default:
      return status;
  }
}
