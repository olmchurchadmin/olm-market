import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const VISIT_COOKIE = "cm_visit_day";
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests|headless/i;

function detectDevice(ua: string): "desktop" | "mobile" {
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

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOT_UA.test(ua)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const day = todayKey();
  const already = request.cookies.get(VISIT_COOKIE)?.value === day;
  if (already) {
    return NextResponse.json({ ok: true, counted: false });
  }

  let device: "desktop" | "mobile" = detectDevice(ua);
  try {
    const body = (await request.json()) as { device?: string };
    if (body.device === "mobile" || body.device === "desktop") {
      device = body.device;
    }
  } catch {
    // body optional
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc("record_site_visit", {
      p_device: device,
      p_is_unique: true,
    });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record visit";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, counted: true, device });
  response.cookies.set(VISIT_COOKIE, day, {
    path: "/",
    maxAge: 60 * 60 * 36,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
