"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { deleteListingAction } from "@/lib/actions/listings";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  return (
    <form
      action={deleteListingAction}
      onSubmit={(event) => {
        if (!window.confirm("이 물품을 삭제할까요? 삭제 후 되돌릴 수 없습니다.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="listing_id" value={listingId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        <TrashIcon className="size-3.5" aria-hidden />
        삭제
      </button>
    </form>
  );
}
