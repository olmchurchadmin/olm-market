import { createClient } from "@/lib/supabase/server";
import { createListingAction } from "@/lib/actions/listings";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { SelectField } from "@/components/ui/select-field";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-brand">
        판매 등록
      </h1>
      <p className="mt-2 text-ink-muted">
        사진과 가격을 올리면 장터에 바로 노출됩니다.
      </p>

      <form action={createListingAction} className="mt-8 space-y-5">
        <label className="block text-sm font-medium">
          제목
          <input
            name="title"
            required
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <SelectField
          label="카테고리"
          name="category_id"
          required
          defaultValue=""
          options={(categories || []).map((cat) => ({
            value: cat.id,
            label: cat.name_ko,
          }))}
        />

        <label className="block text-sm font-medium">
          가격 (USD)
          <input
            name="price"
            type="number"
            min="0"
            step="1"
            required
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <label className="block text-sm font-medium">
          설명
          <textarea
            name="description"
            rows={5}
            className="mt-1 w-full rounded-md border border-brand/15 bg-white px-3 py-2 outline-none focus:border-brand"
          />
        </label>

        <FileUploadField
          label="사진"
          name="images"
          hint="최대 6장 · 큰 사진은 자동으로 줄여 올립니다"
        />

        <button
          type="submit"
          className="rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-soft"
        >
          등록하기
        </button>
      </form>
    </main>
  );
}
