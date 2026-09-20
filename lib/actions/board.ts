"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isStaffRole } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

async function requireMember() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/board");
  }
  return profile;
}

export async function createBoardPostAction(formData: FormData) {
  const profile = await requireMember();
  const { t } = await getI18n();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!title || !body) {
    redirect(
      `/board/new?error=${encodeURIComponent(t.errors.requiredFields)}`,
    );
  }
  if (title.length > 120) {
    redirect(
      `/board/new?error=${encodeURIComponent(t.board.titleTooLong)}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .insert({
      author_id: profile.id,
      title,
      body,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/board/new?error=${encodeURIComponent(error?.message || t.board.createFailed)}`,
    );
  }

  revalidatePath("/board");
  redirect(`/board/${data.id}`);
}

export async function updateBoardPostAction(formData: FormData) {
  const profile = await requireMember();
  const { t } = await getI18n();
  const postId = String(formData.get("post_id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!postId) redirect("/board");
  if (!title || !body) {
    redirect(
      `/board/${postId}/edit?error=${encodeURIComponent(t.errors.requiredFields)}`,
    );
  }
  if (title.length > 120) {
    redirect(
      `/board/${postId}/edit?error=${encodeURIComponent(t.board.titleTooLong)}`,
    );
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("board_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!existing) redirect("/board");
  if (existing.author_id !== profile.id) {
    redirect(`/board/${postId}`);
  }

  const { error } = await supabase
    .from("board_posts")
    .update({ title, body })
    .eq("id", postId)
    .eq("author_id", profile.id);

  if (error) {
    redirect(
      `/board/${postId}/edit?error=${encodeURIComponent(error.message || t.board.updateFailed)}`,
    );
  }

  revalidatePath("/board");
  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}

export async function deleteBoardPostAction(formData: FormData) {
  const profile = await requireMember();
  const postId = String(formData.get("post_id") || "").trim();
  if (!postId) redirect("/board");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("board_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!existing) redirect("/board");

  const canDelete =
    existing.author_id === profile.id || isStaffRole(profile.role);
  if (!canDelete) {
    redirect(`/board/${postId}`);
  }

  await supabase.from("board_posts").delete().eq("id", postId);

  revalidatePath("/board");
  redirect("/board?deleted=1");
}

export async function createBoardReplyAction(formData: FormData) {
  const profile = await requireMember();
  const { t } = await getI18n();
  const postId = String(formData.get("post_id") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!postId) redirect("/board");
  if (!body) {
    redirect(
      `/board/${postId}?error=${encodeURIComponent(t.board.replyRequired)}`,
    );
  }

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("board_posts")
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) redirect("/board");

  const { error } = await supabase.from("board_replies").insert({
    post_id: postId,
    author_id: profile.id,
    body,
  });

  if (error) {
    redirect(
      `/board/${postId}?error=${encodeURIComponent(error.message || t.board.replyFailed)}`,
    );
  }

  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}

export async function deleteBoardReplyAction(formData: FormData) {
  const profile = await requireMember();
  const postId = String(formData.get("post_id") || "").trim();
  const replyId = String(formData.get("reply_id") || "").trim();
  if (!postId || !replyId) redirect("/board");

  const supabase = await createClient();
  const { data: reply } = await supabase
    .from("board_replies")
    .select("id, author_id, post_id")
    .eq("id", replyId)
    .maybeSingle();

  if (!reply) redirect(`/board/${postId}`);

  const canDelete =
    reply.author_id === profile.id || isStaffRole(profile.role);
  if (!canDelete) {
    redirect(`/board/${postId}`);
  }

  await supabase.from("board_replies").delete().eq("id", replyId);

  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}
