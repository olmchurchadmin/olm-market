"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function createComplaintAction(formData: FormData) {
  const { t } = await getI18n();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!subject || !body) {
    redirect(
      `/account/complaints?error=${encodeURIComponent(t.errors.complaintRequired)}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/complaints");

  const { error } = await supabase.from("complaints").insert({
    user_id: user.id,
    subject,
    body,
    status: "open",
  });

  if (error) {
    redirect(
      `/account/complaints?error=${encodeURIComponent(error.message || t.errors.complaintFailed)}`,
    );
  }

  revalidatePath("/account/complaints");
  revalidatePath("/admin");
  redirect("/account/complaints?saved=complaint");
}

export async function resolveComplaintAction(formData: FormData) {
  const complaintId = String(formData.get("complaint_id") || "");
  if (!complaintId) {
    redirect("/admin?error=missing");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { error } = await supabase
    .from("complaints")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", complaintId);

  if (error) {
    const { t } = await getI18n();
    redirect(
      `/admin?error=${encodeURIComponent(error.message || t.errors.resolveFailed)}`,
    );
  }

  revalidatePath("/admin");
  redirect("/admin?resolved=1");
}

export async function replyComplaintAction(formData: FormData) {
  const complaintId = String(formData.get("complaint_id") || "").trim();
  const reply = String(formData.get("reply") || "").trim();
  if (!complaintId || !reply) {
    redirect(
      `/account/complaints?error=${encodeURIComponent("Reply is required")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/complaints");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { error } = await supabase
    .from("complaints")
    .update({
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      replied_by: user.id,
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", complaintId);

  if (error) {
    const { t } = await getI18n();
    redirect(
      `/account/complaints?error=${encodeURIComponent(error.message || t.errors.resolveFailed)}`,
    );
  }

  revalidatePath("/account/complaints");
  revalidatePath("/admin");
  redirect("/account/complaints?saved=replied");
}
