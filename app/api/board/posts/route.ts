import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  BOARD_PAGE_SIZE,
  fetchBoardPostsPage,
} from "@/lib/board/posts-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  try {
    const result = await fetchBoardPostsPage({
      page,
      pageSize: BOARD_PAGE_SIZE,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/board/posts]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
