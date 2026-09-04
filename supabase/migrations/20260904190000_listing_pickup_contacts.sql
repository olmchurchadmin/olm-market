-- Private seller pickup address/phone for seller_location listings.
-- Not readable via public listings; only seller, buyer after purchase, admin, and service role.

create table public.listing_pickup_contacts (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.listing_pickup_contacts is
  'Seller home-pickup address and phone; never shown on public listing pages';

create trigger listing_pickup_contacts_updated_at
  before update on public.listing_pickup_contacts
  for each row execute function public.set_updated_at();

alter table public.listing_pickup_contacts enable row level security;

create policy "Sellers manage own pickup contacts"
  on public.listing_pickup_contacts for all to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.seller_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.seller_id = auth.uid() or public.is_admin())
    )
  );

create policy "Buyers read pickup contacts after purchase"
  on public.listing_pickup_contacts for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.listing_id = listing_pickup_contacts.listing_id
        and o.buyer_id = auth.uid()
        and o.status <> 'cancelled'
    )
  );

grant select, insert, update, delete on public.listing_pickup_contacts to authenticated;
