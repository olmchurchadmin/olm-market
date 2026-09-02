import { NextResponse } from "next/server";
import {
  fetchMarketListingsPage,
  MARKET_PAGE_SIZE,
} from "@/lib/market/listings-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const category = searchParams.get("category") || undefined;
  const q = searchParams.get("q") || undefined;

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  try {
    const result = await fetchMarketListingsPage({
      category,
      q,
      page,
      pageSize: MARKET_PAGE_SIZE,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/market/listings]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
