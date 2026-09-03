import type { EmailOtpType } from "@supabase/supabase-js";

function siteOrigin() {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000";
  return base.replace(/\/$/, "");
}

/** Map generateLink verification_type → verifyOtp type. */
export function toEmailOtpType(verificationType: string): EmailOtpType {
  switch (verificationType) {
    case "recovery":
      return "recovery";
    case "invite":
      return "invite";
    case "magiclink":
      return "magiclink";
    case "email_change_current":
    case "email_change_new":
      return "email_change";
    case "signup":
    default:
      return "signup";
  }
}

/**
 * Build an app-hosted confirm URL using token_hash.
 * Avoids Supabase /auth/v1/verify links that email scanners often burn (otp_expired).
 */
export function buildEmailConfirmUrl(options: {
  tokenHash: string;
  verificationType: string;
  next?: string;
}) {
  const next = options.next?.startsWith("/") ? options.next : "/";
  const params = new URLSearchParams({
    token_hash: options.tokenHash,
    type: toEmailOtpType(options.verificationType),
    next,
  });
  return `${siteOrigin()}/auth/confirm?${params.toString()}`;
}
