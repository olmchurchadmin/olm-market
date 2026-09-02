import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
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
  const statusParam = searchParams.get("status");
  const status = statusParam === "sold" ? ("sold" as const) : ("active" as const);

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  if (status === "sold") {
    const profile = await getCurrentProfile();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const result = await fetchMarketListingsPage({
      category: status === "sold" ? undefined : category,
      q,
      page,
      pageSize: MARKET_PAGE_SIZE,
      status,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/market/listings]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
