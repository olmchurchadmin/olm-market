import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  let next = searchParams.get("next") || "/";
  if (!next.startsWith("/")) next = "/";

  const supabase = await createClient();

  // PKCE / OAuth code exchange
  if (code) {
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

  // Legacy / alternate verify links with token_hash in the query string
  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("[auth/callback] verifyOtp:", error.message);
    const { t } = await getI18n();
    const message =
      /expired|invalid/i.test(error.message)
        ? t.errors.emailLinkInvalid
        : t.errors.authFailed;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, origin),
    );
  }

  const { t } = await getI18n();
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(t.errors.authFailed)}`, origin),
  );
}
