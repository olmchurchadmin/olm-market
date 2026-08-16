/**
 * Twilio SMS. Without credentials, jobs are marked pending_credentials.
 */
export function toE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  // US local 10-digit
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US with leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // Korea mobile 010xxxxxxxx → +8210xxxxxxxx
  if (digits.length === 11 && digits.startsWith("010")) {
    return `+82${digits.slice(1)}`;
  }

  return `+${digits}`;
}

export async function sendSms(options: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !from) {
    return { ok: false as const, reason: "pending_credentials" as const };
  }

  const to = toE164(options.to);
  if (!to) {
    return { ok: false as const, reason: "skipped" as const };
  }

  const fromE164 = toE164(from);
  if (!fromE164) {
    return {
      ok: false as const,
      reason: "failed" as const,
      error: "Invalid TWILIO_PHONE_NUMBER",
    };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    From: fromE164,
    Body: options.body,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false as const, reason: "failed" as const, error: errText };
    }

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      reason: "failed" as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
