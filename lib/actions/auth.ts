"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { buildEmailConfirmUrl } from "@/lib/auth-links";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notifications/email";
import {
  confirmEmailHtml,
  passwordResetEmailHtml,
} from "@/lib/notifications/auth-emails";

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

  const origin = await originBase();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const safeNext = next.startsWith("/") ? next : "/";

  // Prefer admin generateLink + branded Resend mail so users never get the
  // default Supabase "Confirm your email address" template.
  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo },
    });

    if (error) {
      const already =
        /already registered|already exists|user already/i.test(error.message);
      if (already) {
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

    const props = data?.properties;
    const confirmUrl =
      props?.hashed_token
        ? buildEmailConfirmUrl({
            tokenHash: props.hashed_token,
            verificationType: props.verification_type || "signup",
            next: safeNext,
          })
        : props?.action_link;

    if (confirmUrl) {
      const result = await sendEmail({
        to: email,
        subject: "[OLM Market] Confirm your email address",
        html: confirmEmailHtml(confirmUrl),
      });
      if (result.ok) {
        redirect(
          `/login?mode=signin&sent=signup&next=${encodeURIComponent(next)}`,
        );
      }
      console.error(
        "[signup] Resend confirm email failed:",
        "reason" in result ? result.reason : "unknown",
        "error" in result ? result.error : "",
      );
    }

    // Resend unavailable: auto-confirm so signup still works.
    if (data?.user?.id) {
      await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
    }
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError) redirect(next);
    redirect(
      `/login?mode=signin&error=${encodeURIComponent(mapAuthError(signInError.message, t))}&next=${encodeURIComponent(next)}`,
    );
  } catch (err) {
    console.error("[signup] branded confirm path error:", err);
  }

  // Last resort: public signUp (may send Supabase default mail if confirm is on).
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    const already =
      /already registered|already exists|user already/i.test(error.message);
    if (already) {
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

  if (data.session) redirect(next);

  if (data.user?.id) {
    try {
      const admin = createServiceClient();
      await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
    } catch {
      // continue
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) redirect(next);

  redirect(
    `/login?mode=signin&error=${encodeURIComponent(mapAuthError(signInError.message, t))}&next=${encodeURIComponent(next)}`,
  );
}

export async function confirmEmailAction(formData: FormData) {
  const { t } = await getI18n();
  const tokenHash = String(formData.get("token_hash") || "").trim();
  const type = String(formData.get("type") || "signup").trim() as EmailOtpType;
  let next = String(formData.get("next") || "/");
  if (!next.startsWith("/")) next = "/";

  if (!tokenHash) {
    redirect(
      `/auth/confirm?error=${encodeURIComponent(t.errors.emailLinkInvalid)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp:", error.message);
    redirect(
      `/login?error=${encodeURIComponent(mapAuthError(error.message, t))}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
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

      if (!error && data?.properties?.hashed_token) {
        const confirmUrl = buildEmailConfirmUrl({
          tokenHash: data.properties.hashed_token,
          verificationType: data.properties.verification_type || "recovery",
          next: "/login/update-password",
        });
        const result = await sendEmail({
          to: email,
          subject: "[OLM Market] Reset your password",
          html: passwordResetEmailHtml(confirmUrl),
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
      } else if (!error && data?.properties?.action_link) {
        const result = await sendEmail({
          to: email,
          subject: "[OLM Market] Reset your password",
          html: passwordResetEmailHtml(data.properties.action_link),
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

export async function adminDeleteMemberAction(formData: FormData) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (adminProfile?.role !== "admin") {
    redirect("/");
  }

  const targetId = String(formData.get("user_id") || "").trim();
  const fail = (message: string) =>
    redirect(
      `/admin?tab=members&error=${encodeURIComponent(message)}`,
    );

  if (!targetId) {
    fail(t.errors.deleteMemberFailed);
  }
  if (targetId === user.id) {
    fail(t.errors.deleteMemberForbidden);
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    fail(t.errors.deleteMemberFailed);
    return;
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", targetId)
    .maybeSingle();

  if (!target || target.role === "admin") {
    fail(t.errors.deleteMemberForbidden);
  }

  const { count: activeCount, error: activeError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .or(`buyer_id.eq.${targetId},seller_id.eq.${targetId}`)
    .in("status", ["reserved", "awaiting_dropoff", "ready_for_pickup"]);

  if (activeError) {
    fail(activeError.message || t.errors.deleteMemberFailed);
  }
  if ((activeCount || 0) > 0) {
    fail(t.errors.deleteMemberActiveTrades);
  }

  const { data: listings, error: listingsError } = await admin
    .from("listings")
    .select("id")
    .eq("seller_id", targetId);

  if (listingsError) {
    fail(listingsError.message || t.errors.deleteMemberFailed);
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
    .or(`buyer_id.eq.${targetId},seller_id.eq.${targetId}`);

  if (ordersError) {
    fail(ordersError.message || t.errors.deleteMemberFailed);
  }

  if (listingIds.length) {
    await admin.from("listing_images").delete().in("listing_id", listingIds);
    const { error: deleteListingsError } = await admin
      .from("listings")
      .delete()
      .eq("seller_id", targetId);
    if (deleteListingsError) {
      fail(deleteListingsError.message || t.errors.deleteMemberFailed);
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(targetId);
  if (deleteUserError) {
    fail(deleteUserError.message || t.errors.deleteMemberFailed);
  }

  revalidatePath("/admin");
  redirect("/admin?tab=members&memberDeleted=1");
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
  if (
    lower.includes("otp_expired") ||
    lower.includes("invalid or has expired") ||
    lower.includes("token has expired") ||
    lower.includes("email link is invalid")
  ) {
    return t.errors.emailLinkInvalid;
  }
  return message || t.errors.requestFailed;
}
