import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

export const MARKET_PAGE_SIZE = 12;

export function sanitizeMarketSearch(value: string) {
  return value.trim().replace(/[%_,]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

export async function fetchMarketListingsPage(options: {
  category?: string;
  q?: string;
  page: number;
  pageSize?: number;
}): Promise<{ items: Listing[]; total: number; hasMore: boolean }> {
  const page = Math.max(1, Math.floor(options.page) || 1);
  const pageSize = options.pageSize ?? MARKET_PAGE_SIZE;
  const queryText = sanitizeMarketSearch(options.q || "");

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  let query = supabase
    .from("listings")
    .select(
      "*, categories(*), listing_images(*), seller:profiles!listings_seller_id_fkey(nickname, full_name, email, is_anonymous)",
      { count: "exact" },
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (options.category) {
    const match = categories?.find((c) => c.slug === options.category);
    if (match) query = query.eq("category_id", match.id);
  }

  if (queryText) {
    query = query.or(
      `title.ilike.%${queryText}%,description.ilike.%${queryText}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: listings, count } = await query.range(from, to);
  const items = (listings as Listing[] | null) || [];
  const total = count ?? items.length;
  const hasMore = from + items.length < total;

  return { items, total, hasMore };
}
