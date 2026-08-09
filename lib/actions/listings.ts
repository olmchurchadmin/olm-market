"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sell");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const categoryId = String(formData.get("category_id") || "");
  const priceDollars = Number(formData.get("price") || 0);
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!title || !categoryId || Number.isNaN(priceDollars) || priceDollars < 0) {
    throw new Error("필수 항목을 확인해 주세요.");
  }

  const priceCents = Math.round(priceDollars * 100);

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      category_id: categoryId,
      title,
      description,
      price_cents: priceCents,
      status: "available",
    })
    .select("id")
    .single();

  if (error || !listing) {
    throw new Error(error?.message || "등록에 실패했습니다.");
  }

  const uploadedPaths: string[] = [];
  for (let i = 0; i < Math.min(files.length, 6); i += 1) {
    const file = files[i];
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${listing.id}/${i}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (!uploadError) {
      uploadedPaths.push(path);
      await supabase.from("listing_images").insert({
        listing_id: listing.id,
        storage_path: path,
        sort_order: i,
      });
    }
  }

  if (uploadedPaths[0]) {
    await supabase
      .from("listings")
      .update({ cover_image_path: uploadedPaths[0] })
      .eq("id", listing.id);
  }

  revalidatePath("/market");
  revalidatePath("/account/transactions");
  revalidatePath("/me");
  redirect(`/market/${listing.id}`);
}
