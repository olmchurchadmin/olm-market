import { olmLogoSvgMarkup } from "@/lib/notifications/email-logo";

/** Branded auth emails (confirm / password reset) for Resend. */

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function brandedAuthEmailHtml(options: {
  title: string;
  body: string;
  buttonLabel: string;
  actionLink: string;
  footerNote?: string;
}) {
  const year = new Date().getFullYear();
  const link = escapeHtml(options.actionLink);
  const title = escapeHtml(options.title);
  const body = escapeHtml(options.body);
  const buttonLabel = escapeHtml(options.buttonLabel);
  const footerNote = escapeHtml(
    options.footerNote ||
      "If you did not request this email, you can safely ignore it.",
  );
  const logo = olmLogoSvgMarkup(240);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;">
              <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:700;color:#111111;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 20px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#4b5563;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <a
                href="${link}"
                style="display:inline-block;background:#243b8f;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;"
              >${buttonLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
              If the button does not work, copy and paste this link into your browser:
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;word-break:break-all;">
              <a href="${link}" style="color:#243b8f;text-decoration:underline;">${link}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 12px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
              ${footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:12px;color:#9ca3af;">
              © ${year} Our Lady of Mercy Parish · OLM Market
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function confirmEmailHtml(actionLink: string) {
  return brandedAuthEmailHtml({
    title: "Confirm your email address",
    body: "Click the button below to open the confirmation page, then press Confirm to finish signing up for OLM Market.",
    buttonLabel: "Confirm email address",
    actionLink,
    footerNote:
      "If you did not create an OLM Market account, you can safely ignore this email.",
  });
}

export function passwordResetEmailHtml(actionLink: string) {
  return brandedAuthEmailHtml({
    title: "Reset your password",
    body: "We received a request to reset the password for your OLM Market account. Click the button below, then continue on the next page to choose a new password.",
    buttonLabel: "Set a new password",
    actionLink,
    footerNote:
      "If you did not request this email, you can safely ignore it.",
  });
}
