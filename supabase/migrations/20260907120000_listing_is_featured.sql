-- Admin-curated featured listings (pin to top of market).

alter table public.listings
  add column if not exists is_featured boolean not null default false;

create index if not exists listings_featured_created_idx
  on public.listings (is_featured desc, created_at desc)
  where status not in ('sold', 'cancelled');
