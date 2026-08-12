-- Church donation percent on listings (30–100)
alter table public.listings
  add column if not exists donation_percent integer not null default 30
  check (donation_percent >= 30 and donation_percent <= 100);

comment on column public.listings.donation_percent is
  'Percent of sale price donated to the parish (30-100)';
