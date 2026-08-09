import { BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { SellingListingRow } from "@/components/selling-listing-row";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";
import {
  accountDisplayName,
  formatPrice,
  listingImageUrl,
  orderStatusLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { error, deleted } = await searchParams;

  if (!profile) return null;

  const [{ data: selling }, { data: buying }, { data: notifications }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("seller_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*, listings(*)")
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  return (
    <AccountShell
      title="My Account"
      subtitle={`${accountDisplayName(profile)} · 내 거래`}
      active="transactions"
    >
      {error ? (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {deleted ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          물품을 삭제했습니다.
        </p>
      ) : null}

      <section>
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-brand">
          <BellIcon className="size-6" aria-hidden />
          알림
        </h2>
        <ul className="mt-4 space-y-3">
          {(notifications || []).length ? (
            notifications!.map((n) => (
              <li
                key={n.id}
                className="rounded-md border border-brand/10 bg-white/70 px-4 py-3"
              >
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
              </li>
            ))
          ) : (
            <li className="text-sm text-ink-muted">아직 알림이 없습니다.</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-brand">
          내가 파는 물건
        </h2>
        <ul className="mt-4 space-y-3">
          {(selling || []).length ? (
            (selling as Listing[]).map((item) => (
              <SellingListingRow key={item.id} listing={item} />
            ))
          ) : (
            <li className="text-sm text-ink-muted">등록한 물건이 없습니다.</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-brand">
          내가 산 물건
        </h2>
        <ul className="mt-4 space-y-3">
          {(buying || []).length ? (
            buying!.map((order) => {
              const listing = Array.isArray(order.listings)
                ? order.listings[0]
                : order.listings;
              const thumb = listingImageUrl(listing?.cover_image_path);
              return (
                <li
                  key={order.id}
                  className="flex gap-3 rounded-md border border-brand/10 bg-white/70 p-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)] sm:size-20">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-ink-muted">
                        No image
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {listing?.id ? (
                      <Link
                        href={`/market/${listing.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {listing.title || "물품"}
                      </Link>
                    ) : (
                      <p className="font-medium">{listing?.title || "물품"}</p>
                    )}
                    <p className="text-sm text-ink-muted">
                      {formatPrice(order.price_cents)} ·{" "}
                      {orderStatusLabel(order.status)}
                    </p>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="text-sm text-ink-muted">구매 내역이 없습니다.</li>
          )}
        </ul>
      </section>
    </AccountShell>
  );
}
