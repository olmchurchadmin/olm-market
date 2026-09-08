-- Per-user watchlist of market listings.

create table if not exists public.watchlist (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists watchlist_user_created_idx
  on public.watchlist (user_id, created_at desc);

create index if not exists watchlist_listing_idx
  on public.watchlist (listing_id);

alter table public.watchlist enable row level security;

create policy "Users read own watchlist"
  on public.watchlist for select to authenticated
  using (user_id = auth.uid());

create policy "Users insert own watchlist"
  on public.watchlist for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users delete own watchlist"
  on public.watchlist for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.watchlist to authenticated;
