import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { SellingListingRow } from "@/components/selling-listing-row";
import { SharePickupDetails } from "@/components/share-pickup-details";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
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
  const { locale, t } = await getI18n();
  const supabase = await createClient();
  const { error, deleted } = await searchParams;

  if (!profile) return null;

  const [{ data: selling }, { data: buying }, { data: sellingOrders }, { data: sharedRows }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("seller_id", profile.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*, listings(*)")
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*, listings(*)")
        .eq("seller_id", profile.id)
        .in("status", ["awaiting_dropoff", "ready_for_pickup"])
        .order("created_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("payload")
        .eq("user_id", profile.id)
        .eq("type", "order_pickup_details"),
    ]);

  const sellingListingIds = (sellingOrders || [])
    .map((order) => {
      const listing = Array.isArray(order.listings)
        ? order.listings[0]
        : order.listings;
      return listing?.id as string | undefined;
    })
    .filter(Boolean) as string[];

  const { data: pickupContacts } = sellingListingIds.length
    ? await supabase
        .from("listing_pickup_contacts")
        .select("listing_id, address, phone")
        .in("listing_id", sellingListingIds)
    : { data: [] as { listing_id: string; address: string; phone: string }[] };

  const pickupByListingId = new Map(
    (pickupContacts || []).map((row) => [row.listing_id, row]),
  );

  const sharedOrderIds = new Set(
    (sharedRows || [])
      .map((row) => (row.payload as { order_id?: string } | null)?.order_id)
      .filter(Boolean) as string[],
  );

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${t.account.transactions}`}
      active="transactions"
    >
      {error ? (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {deleted ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.account.deleted}
        </p>
      ) : null}

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
          {t.account.selling}
        </h2>
        <ul className="mt-4 space-y-3">
          {(selling || []).length ? (
            (selling as Listing[]).map((item) => (
              <SellingListingRow key={item.id} listing={item} />
            ))
          ) : (
            <li className="text-sm text-ink-muted">{t.account.noSelling}</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
          {t.account.sellingOrders}
        </h2>
        <ul className="mt-4 space-y-3">
          {(sellingOrders || []).length ? (
            sellingOrders!.map((order) => {
              const listing = Array.isArray(order.listings)
                ? order.listings[0]
                : order.listings;
              const homePickup = listing?.pickup_method === "seller_location";
              const savedPickup = listing?.id
                ? pickupByListingId.get(listing.id)
                : undefined;
              return (
                <li
                  key={order.id}
                  className="rounded-md border border-brand/10 bg-white/70 p-3"
                >
                  {listing?.id ? (
                    <Link
                      href={`/market/${listing.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {listing.title || t.account.item}
                    </Link>
                  ) : (
                    <p className="font-medium">
                      {listing?.title || t.account.item}
                    </p>
                  )}
                  <p className="text-sm text-ink-muted">
                    {formatPrice(order.price_cents, locale)} ·{" "}
                    {orderStatusLabel(order.status, t.status)} ·{" "}
                    {homePickup ? t.market.pickupSeller : t.market.pickupChurch}
                  </p>
                  {homePickup ? (
                    <SharePickupDetails
                      orderId={order.id}
                      defaultNote={savedPickup?.address || ""}
                      defaultContact={
                        savedPickup?.phone || profile.phone || ""
                      }
                      alreadySent={sharedOrderIds.has(order.id)}
                    />
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="text-sm text-ink-muted">
              {t.account.noSellingOrders}
            </li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
          {t.account.buying}
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
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-muted">
                        {t.market.noImage}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {listing?.id ? (
                      <Link
                        href={`/market/${listing.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {listing.title || t.account.item}
                      </Link>
                    ) : (
                      <p className="font-medium">
                        {listing?.title || t.account.item}
                      </p>
                    )}
                    <p className="text-sm text-ink-muted">
                      {formatPrice(order.price_cents, locale)} ·{" "}
                      {orderStatusLabel(order.status, t.status)}
                    </p>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="text-sm text-ink-muted">{t.account.noBuying}</li>
          )}
        </ul>
      </section>
    </AccountShell>
  );
}
