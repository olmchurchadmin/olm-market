"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notifications/email";

function siteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

async function originBase() {
  return (await headers()).get("origin") || siteUrl();
}

export async function signInWithOAuth(
  provider: "google" | "kakao",
  next = "/market",
) {
  const supabase = await createClient();
  const origin = await originBase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    throw new Error(error?.message || "로그인에 실패했습니다.");
  }
  redirect(data.url);
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/market");

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent("이메일과 비밀번호를 입력해 주세요.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(mapAuthError(error.message))}&next=${encodeURIComponent(next)}`,
    );
  }
  redirect(next);
}

export async function signUpWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const next = String(formData.get("next") || "/market");

  if (!email || !password) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("이메일과 비밀번호를 입력해 주세요.")}&next=${encodeURIComponent(next)}`,
    );
  }
  if (password.length < 6) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("비밀번호는 6자 이상이어야 합니다.")}&next=${encodeURIComponent(next)}`,
    );
  }
  if (password !== confirm) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("비밀번호가 일치하지 않습니다.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();
  const origin = await originBase();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    const already =
      /already registered|already exists|user already/i.test(error.message);
    if (!already) {
      redirect(
        `/login?mode=signup&error=${encodeURIComponent(mapAuthError(error.message))}&next=${encodeURIComponent(next)}`,
      );
    }
    // Existing account: still try to send a confirmation / login link via Resend.
    await sendSignupConfirmEmail(email, password, redirectTo);
    redirect(
      `/login?mode=signin&sent=signup&next=${encodeURIComponent(next)}`,
    );
  }

  if (data.session) {
    redirect(next);
  }

  // Confirm-email is ON: Supabase built-in mail often doesn't arrive.
  // Send the confirmation link ourselves via Resend.
  const sendResult = await sendSignupConfirmEmail(email, password, redirectTo);
  if (sendResult && !sendResult.ok) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(mapEmailSendError(sendResult))}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(
    `/login?mode=signin&sent=signup&next=${encodeURIComponent(next)}`,
  );
}

async function sendSignupConfirmEmail(
  email: string,
  password: string,
  redirectTo: string,
) {
  try {
    const admin = createServiceClient();
    let actionLink: string | undefined;

    const signupLink = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo },
    });
    actionLink = signupLink.data?.properties?.action_link;

    if (!actionLink) {
      const magic = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      actionLink = magic.data?.properties?.action_link;
    }

    if (!actionLink) {
      return { ok: false as const, reason: "failed" as const, error: "No action link" };
    }

    return await sendEmail({
      to: email,
      subject: "[Church Market] 이메일 인증",
      html: signupConfirmHtml(actionLink),
    });
  } catch (err) {
    return {
      ok: false as const,
      reason: "failed" as const,
      error: err instanceof Error ? err.message : "send failed",
    };
  }
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const next = String(formData.get("next") || "/market");

  if (!email) {
    redirect(
      `/login?mode=forgot&error=${encodeURIComponent("이메일을 입력해 주세요.")}`,
    );
  }

  const origin = await originBase();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/login/update-password")}`;

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (!error && data?.properties?.action_link) {
      const result = await sendEmail({
        to: email,
        subject: "[Church Market] 비밀번호 재설정",
        html: passwordResetHtml(data.properties.action_link),
      });
      if (!result.ok && result.reason === "pending_credentials") {
        // Fallback to Supabase built-in mail if Resend is not configured
        const supabase = await createClient();
        await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      }
    }
  } catch {
    // Always show success to avoid email enumeration
  }

  redirect(`/login?mode=forgot&sent=reset&next=${encodeURIComponent(next)}`);
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 6) {
    redirect(
      `/login/update-password?error=${encodeURIComponent("비밀번호는 6자 이상이어야 합니다.")}`,
    );
  }
  if (password !== confirm) {
    redirect(
      `/login/update-password?error=${encodeURIComponent("비밀번호가 일치하지 않습니다.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(
      `/login/update-password?error=${encodeURIComponent(mapAuthError(error.message))}`,
    );
  }
  redirect("/market");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updatePhoneAction(formData: FormData) {
  const phone = String(formData.get("phone") || "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({ phone }).eq("id", user.id);
  redirect("/me");
}

function mapAuthError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  }
  if (lower.includes("password") && lower.includes("6")) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }
  if (lower.includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 받은편지함을 확인해 주세요.";
  }
  return message || "요청을 처리하지 못했습니다.";
}

function mapEmailSendError(result: {
  ok: false;
  reason: "pending_credentials" | "failed";
  error?: string;
}) {
  if (result.reason === "pending_credentials") {
    return "메일 발송 설정(RESEND)이 없습니다. 관리자에게 문의해 주세요.";
  }
  const msg = (result.error || "").toLowerCase();
  if (
    msg.includes("only send testing emails") ||
    msg.includes("verify a domain") ||
    msg.includes("not verified")
  ) {
    return "Resend 테스트 발신으로는 가입한 계정 이메일로만 보낼 수 있습니다. Resend에서 도메인을 인증하거나, 인증 메일 없이 가입하도록 Supabase Confirm email을 끄세요.";
  }
  return "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function brandedAuthHtml(options: {
  title: string;
  body: string;
  buttonLabel: string;
  actionLink: string;
}) {
  return `
  <div style="font-family:Manrope,Helvetica,Arial,sans-serif;background:#f3efe6;padding:32px 16px;color:#1c2a1f;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid rgba(31,77,58,0.12);">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#2f6b4f;">Church Market</p>
      <h1 style="margin:0 0 12px;font-size:24px;color:#1f4d3a;">${options.title}</h1>
      <p style="margin:0 0 20px;line-height:1.6;color:#4d5c52;">${options.body}</p>
      <p style="margin:0 0 24px;">
        <a href="${options.actionLink}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">${options.buttonLabel}</a>
      </p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#4d5c52;word-break:break-all;">버튼이 작동하지 않으면 이 링크를 복사하세요:<br/>${options.actionLink}</p>
    </div>
  </div>`;
}

function passwordResetHtml(actionLink: string) {
  return brandedAuthHtml({
    title: "비밀번호 재설정",
    body: "아래 버튼을 눌러 새 비밀번호를 설정하세요. 요청하지 않았다면 이 메일을 무시해도 됩니다.",
    buttonLabel: "새 비밀번호 설정",
    actionLink,
  });
}

function signupConfirmHtml(actionLink: string) {
  return brandedAuthHtml({
    title: "이메일 인증",
    body: "Church Market 가입을 완료하려면 아래 버튼을 눌러 이메일을 인증해 주세요.",
    buttonLabel: "이메일 인증하기",
    actionLink,
  });
}
