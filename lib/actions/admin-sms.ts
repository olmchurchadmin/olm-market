"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendSms, toE164 } from "@/lib/notifications/sms";
import { createServiceClient } from "@/lib/supabase/server";

export async function adminTestSmsAction() {
  const profile = await requireAdmin();

  if (!profile.phone) {
    return {
      ok: false as const,
      error: "프로필에 전화번호가 없습니다. 내 계정에서 저장해 주세요.",
    };
  }

  const to = toE164(profile.phone);
  const result = await sendSms({
    to: profile.phone,
    body: "[OLM Market] SMS 테스트입니다. 이 문자가 오면 Twilio 연동이 정상입니다.",
  });

  const supabase = createServiceClient();
  const job = {
    channel: "sms" as const,
    recipient: profile.phone,
    body: "admin SMS test",
    payload: { event: "admin_sms_test", to_e164: to },
    status: result.ok
      ? ("sent" as const)
      : result.reason === "pending_credentials"
        ? ("pending_credentials" as const)
        : result.reason === "skipped"
          ? ("skipped" as const)
          : ("failed" as const),
    error: result.ok ? null : "error" in result ? result.error : result.reason,
    related_order_id: null as string | null,
    sent_at: result.ok ? new Date().toISOString() : null,
  };
  const { error: jobError } = await supabase.from("notification_jobs").insert(job);
  if (jobError) {
    await supabase.from("notification_jobs").insert({ ...job, channel: "kakao" });
  }

  revalidatePath("/admin");

  if (!result.ok) {
    const detail =
      result.reason === "pending_credentials"
        ? "Vercel에 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER 가 없거나 배포에 반영되지 않았습니다."
        : "error" in result
          ? String(result.error)
          : result.reason;
    return { ok: false as const, error: `SMS 실패: ${detail}` };
  }

  return {
    ok: true as const,
    message: `SMS 요청 성공 → ${to || profile.phone}. Twilio Messaging 로그를 확인하세요.`,
  };
}
