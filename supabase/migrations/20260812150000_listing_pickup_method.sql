-- Pickup options for listings: church vs seller location
do $$ begin
  create type public.pickup_method as enum ('church', 'seller_location');
exception
  when duplicate_object then null;
end $$;

alter table public.listings
  add column if not exists pickup_method public.pickup_method not null default 'church';

comment on column public.listings.pickup_method is
  'Where the buyer picks up: church or seller_location';
