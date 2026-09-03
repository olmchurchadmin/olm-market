import { Resend } from "resend";

const ADMIN_EMAIL = "olmchurchadmin@gmail.com";

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL || ADMIN_EMAIL;
}

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false as const, reason: "pending_credentials" as const };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL || "OLM Market <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    return { ok: false as const, reason: "failed" as const, error: error.message };
  }
  return { ok: true as const };
}
