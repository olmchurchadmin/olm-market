import { NextResponse } from "next/server";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") || "/";
  if (!next.startsWith("/")) next = "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (!isLocal && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
  }

  const { t } = await getI18n();
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(t.errors.authFailed)}`, origin),
  );
}
