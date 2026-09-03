"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
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
  next = "/",
) {
  const supabase = await createClient();
  const origin = await originBase();
  const safeNext = next.startsWith("/") ? next : "/";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      // Force Google account picker so logout → login can switch accounts.
      ...(provider === "google"
        ? { queryParams: { prompt: "select_account" } }
        : {}),
      // Do not pass Kakao scopes here — invalid/unconfigured scopes cause
      // invalid_scope / KOE205. Consent items are controlled in Kakao Console.
    },
  });
  if (error || !data.url) {
    const { t } = await getI18n();
    console.error(`[oauth:${provider}]`, error?.message || "missing url");
    redirect(
      `/login?error=${encodeURIComponent(error?.message || t.errors.authFailed)}&next=${encodeURIComponent(safeNext)}`,
    );
  }
  redirect(data.url);
}

export async function signInWithPasswordAction(formData: FormData) {
  const { t } = await getI18n();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent(t.errors.emailPasswordRequired)}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(mapAuthError(error.message, t))}&next=${encodeURIComponent(next)}`,
    );
  }
  redirect(next);
}

export async function signUpWithPasswordAction(formData: FormData) {
  const { t } = await getI18n();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(t.errors.emailPasswordRequired)}&next=${encodeURIComponent(next)}`,
    );
  }
  if (password.length < 6) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(t.errors.passwordMin)}&next=${encodeURIComponent(next)}`,
    );
  }
  if (password !== confirm) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(t.errors.passwordMismatch)}&next=${encodeURIComponent(next)}`,
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
    if (already) {
      // Previous unconfirmed attempt: confirm + sign in, or fall back to login.
      const signedIn = await confirmAndSignIn(email, password);
      if (signedIn) redirect(next);
      redirect(
        `/login?mode=signin&error=${encodeURIComponent(t.errors.alreadyRegistered)}&next=${encodeURIComponent(next)}`,
      );
    }
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(mapAuthError(error.message, t))}&next=${encodeURIComponent(next)}`,
    );
  }

  if (data.session) {
    redirect(next);
  }

  // No session (Confirm email still on, or prior unconfirmed user):
  // auto-confirm via service role so signup works without Resend domain.
  if (data.user?.id) {
    try {
      const admin = createServiceClient();
      await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
    } catch {
      // continue to sign-in attempt
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) {
    redirect(next);
  }

  redirect(
    `/login?mode=signin&error=${encodeURIComponent(mapAuthError(signInError.message, t))}&next=${encodeURIComponent(next)}`,
  );
}

async function confirmAndSignIn(email: string, password: string) {
  try {
    const admin = createServiceClient();
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const user = linkData?.user;
    if (user?.id && !user.email_confirmed_at) {
      await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    }
  } catch {
    // ignore — sign-in below may still work
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const next = String(formData.get("next") || "/");

  if (!email) {
    const { t } = await getI18n();
    redirect(
      `/login?mode=forgot&error=${encodeURIComponent(t.errors.emailRequired)}`,
    );
  }

  const origin = await originBase();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/login/update-password")}`;

  try {
    let delivered = false;

    // Prefer branded Resend mail with an admin-generated recovery link.
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
        if (result.ok) {
          delivered = true;
        } else {
          console.error(
            "[password-reset] Resend failed:",
            "reason" in result ? result.reason : "unknown",
            "error" in result ? result.error : "",
          );
        }
      } else if (error) {
        console.error("[password-reset] generateLink failed:", error.message);
      }
    } catch (err) {
      console.error("[password-reset] Resend path error:", err);
    }

    // Fallback: Supabase Auth email (works when SMTP is configured there).
    // Also covers Resend test-domain limits (can only send to the account owner).
    if (!delivered) {
      const supabase = await createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        console.error(
          "[password-reset] Supabase resetPasswordForEmail failed:",
          error.message,
        );
      }
    }
  } catch (err) {
    // Always show success to avoid email enumeration
    console.error("[password-reset] unexpected error:", err);
  }

  redirect(`/login?mode=forgot&sent=reset&next=${encodeURIComponent(next)}`);
}

export async function updatePasswordAction(formData: FormData) {
  const { t } = await getI18n();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const next = String(formData.get("next") || "/login/update-password");
  const errorBase = next.startsWith("/account")
    ? "/account/profile"
    : "/login/update-password";

  if (password.length < 6) {
    redirect(
      `${errorBase}?error=${encodeURIComponent(t.errors.passwordMin)}`,
    );
  }
  if (password !== confirm) {
    redirect(
      `${errorBase}?error=${encodeURIComponent(t.errors.passwordMismatch)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(
      `${errorBase}?error=${encodeURIComponent(mapAuthError(error.message, t))}`,
    );
  }
  if (next.startsWith("/account")) {
    redirect("/account/profile?saved=password");
  }
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccountAction() {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    redirect(
      `/account/profile?error=${encodeURIComponent(t.errors.deleteAccountFailed)}`,
    );
  }

  const uid = user.id;

  const { count: activeCount, error: activeError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
    .in("status", ["reserved", "awaiting_dropoff", "ready_for_pickup"]);

  if (activeError) {
    redirect(
      `/account/profile?error=${encodeURIComponent(activeError.message || t.errors.deleteAccountFailed)}`,
    );
  }
  if ((activeCount || 0) > 0) {
    redirect(
      `/account/profile?error=${encodeURIComponent(t.errors.deleteAccountActiveTrades)}`,
    );
  }

  const { data: listings, error: listingsError } = await admin
    .from("listings")
    .select("id")
    .eq("seller_id", uid);

  if (listingsError) {
    redirect(
      `/account/profile?error=${encodeURIComponent(listingsError.message || t.errors.deleteAccountFailed)}`,
    );
  }

  const listingIds = (listings || []).map((row) => row.id);

  if (listingIds.length) {
    const { data: images } = await admin
      .from("listing_images")
      .select("storage_path")
      .in("listing_id", listingIds);
    const paths = (images || [])
      .map((row) => row.storage_path)
      .filter(Boolean);
    if (paths.length) {
      await admin.storage.from("listing-images").remove(paths);
    }
  }

  const { error: ordersError } = await admin
    .from("orders")
    .delete()
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);

  if (ordersError) {
    redirect(
      `/account/profile?error=${encodeURIComponent(ordersError.message || t.errors.deleteAccountFailed)}`,
    );
  }

  if (listingIds.length) {
    await admin.from("listing_images").delete().in("listing_id", listingIds);
    const { error: deleteListingsError } = await admin
      .from("listings")
      .delete()
      .eq("seller_id", uid);
    if (deleteListingsError) {
      redirect(
        `/account/profile?error=${encodeURIComponent(deleteListingsError.message || t.errors.deleteAccountFailed)}`,
      );
    }
  }

  await supabase.auth.signOut();

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(uid);
  if (deleteUserError) {
    redirect(
      `/login?error=${encodeURIComponent(deleteUserError.message || t.errors.deleteAccountFailed)}`,
    );
  }

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
  redirect("/account/profile?saved=phone");
}

export async function updateProfileAction(formData: FormData) {
  const displayName = String(
    formData.get("display_name") || formData.get("nickname") || "",
  ).trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const notificationEmail = String(formData.get("notification_email") || "").trim();
  const isAnonymous = formData.get("is_anonymous") === "on";

  const { t } = await getI18n();
  if (displayName.length > 40) {
    redirect(
      `/account/profile?error=${encodeURIComponent(t.errors.displayNameTooLong)}`,
    );
  }
  if (fullName.length > 80) {
    redirect(
      `/account/profile?error=${encodeURIComponent(t.errors.fullNameTooLong)}`,
    );
  }

  if (
    notificationEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)
  ) {
    redirect(
      `/account/profile?error=${encodeURIComponent(t.errors.notificationEmailInvalid)}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      nickname: displayName || null,
      full_name: fullName || null,
      phone: phone || null,
      notification_email: notificationEmail || null,
      is_anonymous: isAnonymous,
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/account/profile?error=${encodeURIComponent(error.message || t.errors.profileSaveFailed)}`,
    );
  }

  redirect("/account/profile?saved=profile");
}

function mapAuthError(message: string, t: Dictionary) {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password")
  ) {
    return t.errors.invalidCredentials;
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return t.errors.alreadyRegistered;
  }
  if (lower.includes("password") && lower.includes("6")) {
    return t.errors.passwordMin;
  }
  if (lower.includes("email not confirmed")) {
    return t.errors.emailNotConfirmed;
  }
  return message || t.errors.requestFailed;
}

function brandedAuthHtml(options: {
  title: string;
  body: string;
  buttonLabel: string;
  actionLink: string;
}) {
  return `
  <div style="font-family:Inter,'Noto Sans KR',Helvetica,Arial,sans-serif;background:#fdfcf9;padding:32px 16px;color:#111111;">
    <div style="max-width:480px;margin:0 auto;background:#fbfaf7;border-radius:8px;padding:28px;border:1px solid rgba(17,17,17,0.12);">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#243b8f;">OLM Market</p>
      <h1 style="margin:0 0 12px;font-size:24px;color:#111111;">${options.title}</h1>
      <p style="margin:0 0 20px;line-height:1.6;color:#5c5c5c;">${options.body}</p>
      <p style="margin:0 0 24px;">
        <a href="${options.actionLink}" style="display:inline-block;background:#243b8f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">${options.buttonLabel}</a>
      </p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#5c5c5c;word-break:break-all;">버튼이 작동하지 않으면 이 링크를 복사하세요:<br/>${options.actionLink}</p>
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
