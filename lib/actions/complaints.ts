"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createComplaintAction(formData: FormData) {
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!subject || !body) {
    redirect(
      `/account/profile?error=${encodeURIComponent("제목과 내용을 입력해 주세요.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/profile");

  const { error } = await supabase.from("complaints").insert({
    user_id: user.id,
    subject,
    body,
    status: "open",
  });

  if (error) {
    redirect(
      `/account/profile?error=${encodeURIComponent(error.message || "접수에 실패했습니다.")}`,
    );
  }

  revalidatePath("/account/profile");
  revalidatePath("/admin");
  redirect("/account/profile?saved=complaint");
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
    redirect("/market");
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
    redirect(
      `/admin?error=${encodeURIComponent(error.message || "처리에 실패했습니다.")}`,
    );
  }

  revalidatePath("/admin");
  redirect("/admin?resolved=1");
}
