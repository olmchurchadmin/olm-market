"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isStaffRole, isSuperAdminRole } from "@/lib/auth";
import { MAX_IMAGES_PER_BOARD_POST } from "@/lib/image-compress";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

async function requireMember() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/board");
  }
  return profile;
}

function collectImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadBoardImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  postId: string,
  files: File[],
  startOrder = 0,
) {
  const slice = files.slice(0, MAX_IMAGES_PER_BOARD_POST);
  const maxPerFile = 900_000;
  const maxTotal = 2.5 * 1024 * 1024;
  const { t } = await getI18n();

  for (const file of slice) {
    if (file.size > maxPerFile) {
      throw new Error(t.sell.photoStillTooLarge);
    }
  }
  const totalBytes = slice.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > maxTotal) {
    throw new Error(t.sell.photoTotalTooLarge);
  }

  const uploaded: Array<{ path: string; sort_order: number } | null> = [];
  for (let i = 0; i < slice.length; i++) {
    const file = slice[i]!;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${userId}/${postId}/${startOrder + i}-${crypto.randomUUID()}.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from("board-images")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
    uploaded.push(uploadError ? null : { path, sort_order: startOrder + i });
  }

  const rows = uploaded.filter(
    (row): row is { path: string; sort_order: number } => Boolean(row),
  );
  if (rows.length) {
    await supabase.from("board_post_images").insert(
      rows.map((row) => ({
        post_id: postId,
        storage_path: row.path,
        sort_order: row.sort_order,
      })),
    );
  }
  return rows.map((row) => row.path);
}

async function removeBoardImagesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  imageIds: string[],
) {
  if (!imageIds.length) return;
  const { data: rows } = await supabase
    .from("board_post_images")
    .select("id, storage_path")
    .eq("post_id", postId)
    .in("id", imageIds);

  const paths = (rows || []).map((row) => row.storage_path);
  if (paths.length) {
    await supabase.storage.from("board-images").remove(paths);
  }
  await supabase
    .from("board_post_images")
    .delete()
    .eq("post_id", postId)
    .in("id", imageIds);
}

async function removeAllBoardImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
) {
  const { data: rows } = await supabase
    .from("board_post_images")
    .select("storage_path")
    .eq("post_id", postId);
  const paths = (rows || []).map((row) => row.storage_path);
  if (paths.length) {
    await supabase.storage.from("board-images").remove(paths);
  }
  await supabase.from("board_post_images").delete().eq("post_id", postId);
}

export async function createBoardPostAction(formData: FormData) {
  const profile = await requireMember();
  const { t } = await getI18n();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const isNotice = formData.get("is_notice") === "on";
  const files = collectImageFiles(formData);

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
  if (files.length > MAX_IMAGES_PER_BOARD_POST) {
    redirect(
      `/board/new?error=${encodeURIComponent(
        t.sell.photoLimit.replace("{max}", String(MAX_IMAGES_PER_BOARD_POST)),
      )}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .insert({
      author_id: profile.id,
      title,
      body,
      is_notice: isNotice,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/board/new?error=${encodeURIComponent(error?.message || t.board.createFailed)}`,
    );
  }

  if (files.length) {
    try {
      await uploadBoardImages(supabase, profile.id, data.id, files);
    } catch (err) {
      await removeAllBoardImages(supabase, data.id);
      await supabase.from("board_posts").delete().eq("id", data.id);
      const message =
        err instanceof Error ? err.message : t.board.createFailed;
      redirect(`/board/new?error=${encodeURIComponent(message)}`);
    }
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
  const isNotice = formData.get("is_notice") === "on";
  const files = collectImageFiles(formData);
  const removeIds = formData
    .getAll("remove_image_id")
    .map((value) => String(value).trim())
    .filter(Boolean);

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
    .update({ title, body, is_notice: isNotice })
    .eq("id", postId)
    .eq("author_id", profile.id);

  if (error) {
    redirect(
      `/board/${postId}/edit?error=${encodeURIComponent(error.message || t.board.updateFailed)}`,
    );
  }

  if (removeIds.length) {
    await removeBoardImagesByIds(supabase, postId, removeIds);
  }

  const { count } = await supabase
    .from("board_post_images")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  const remaining = count ?? 0;
  const slotsLeft = Math.max(0, MAX_IMAGES_PER_BOARD_POST - remaining);
  if (files.length > slotsLeft) {
    redirect(
      `/board/${postId}/edit?error=${encodeURIComponent(
        t.sell.photoLimit.replace("{max}", String(MAX_IMAGES_PER_BOARD_POST)),
      )}`,
    );
  }

  if (files.length) {
    try {
      await uploadBoardImages(
        supabase,
        profile.id,
        postId,
        files.slice(0, slotsLeft),
        remaining,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.board.updateFailed;
      redirect(`/board/${postId}/edit?error=${encodeURIComponent(message)}`);
    }
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
    existing.author_id === profile.id || isSuperAdminRole(profile.role);
  if (!canDelete) {
    redirect(`/board/${postId}`);
  }

  await removeAllBoardImages(supabase, postId);
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
