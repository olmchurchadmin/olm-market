/** Branded trade / marketplace notification emails for Resend. */

function siteOrigin() {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000";
  return base.replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bodyToHtml(body: string) {
  return escapeHtml(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 12px 0;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#4b5563;">${line}</p>`,
    )
    .join("");
}

export function brandedNotificationEmailHtml(options: {
  title: string;
  body: string;
  buttonLabel?: string;
  actionLink?: string;
  metaLabel?: string;
  metaValue?: string;
}) {
  const origin = siteOrigin();
  const logoUrl = `${origin}/logo-olm.png`;
  const year = new Date().getFullYear();
  const title = escapeHtml(options.title);
  const bodyHtml = bodyToHtml(options.body);
  const hasButton = Boolean(options.buttonLabel && options.actionLink);
  const link = options.actionLink ? escapeHtml(options.actionLink) : "";
  const buttonLabel = options.buttonLabel
    ? escapeHtml(options.buttonLabel)
    : "";
  const metaLabel = options.metaLabel ? escapeHtml(options.metaLabel) : "";
  const metaValue = options.metaValue ? escapeHtml(options.metaValue) : "";

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
              <img
                src="${logoUrl}"
                alt="Our Lady of Mercy Parish"
                width="240"
                style="display:block;width:240px;max-width:70%;height:auto;border:0;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;">
              <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:700;color:#111111;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 12px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          ${
            metaLabel && metaValue
              ? `<tr>
            <td style="padding:4px 28px 20px 28px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
              <strong style="color:#374151;">${metaLabel}</strong><br />
              <span style="word-break:break-all;">${metaValue}</span>
            </td>
          </tr>`
              : ""
          }
          ${
            hasButton
              ? `<tr>
            <td style="padding:0 28px 28px 28px;">
              <a
                href="${link}"
                style="display:inline-block;background:#243b8f;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;"
              >${buttonLabel}</a>
            </td>
          </tr>`
              : ""
          }
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

export function tradeNotificationEmailHtml(options: {
  title: string;
  body: string;
  orderId?: string | null;
  listingId?: string | null;
  role?: string | null;
}) {
  const origin = siteOrigin();
  const isAdmin = options.role === "admin";
  const actionLink = isAdmin
    ? `${origin}/admin?tab=orders`
    : `${origin}/account/notifications`;
  const buttonLabel = isAdmin ? "관리자에서 확인" : "알림 확인하기";

  return brandedNotificationEmailHtml({
    title: options.title,
    body: options.body,
    buttonLabel,
    actionLink,
    metaLabel: options.orderId
      ? "주문번호"
      : options.listingId
        ? "등록 ID"
        : undefined,
    metaValue: options.orderId || options.listingId || undefined,
  });
}
