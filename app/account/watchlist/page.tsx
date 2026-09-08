import { HeartIcon } from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
import { WatchlistRow } from "@/components/watchlist-row";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";
import { accountDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountWatchlistPage() {
  const profile = await getCurrentProfile();
  const { t } = await getI18n();

  if (!profile) return null;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("watchlist")
    .select(
      "created_at, listings(*, categories(*), seller:profiles!listings_seller_id_fkey(nickname, full_name, email, is_anonymous))",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const listings = (rows || [])
    .map((row) => {
      const listing = Array.isArray(row.listings)
        ? row.listings[0]
        : row.listings;
      return listing as Listing | null;
    })
    .filter((listing): listing is Listing => Boolean(listing));

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${t.account.watchlist}`}
      active="watchlist"
    >
      <section>
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <HeartIcon className="size-6" aria-hidden />
          {t.account.watchlist}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t.account.watchlistBlurb}</p>
        <ul className="mt-4 space-y-3">
          {listings.length ? (
            listings.map((listing) => (
              <WatchlistRow key={listing.id} listing={listing} />
            ))
          ) : (
            <li className="text-sm text-ink-muted">{t.account.noWatchlist}</li>
          )}
        </ul>
      </section>
    </AccountShell>
  );
}
