-- Allow buying multiple units in one order.

alter table public.orders
  add column if not exists quantity integer not null default 1;

alter table public.orders
  drop constraint if exists orders_quantity_check;

alter table public.orders
  add constraint orders_quantity_check check (quantity >= 1);

-- Replace single-arg buy with quantity-aware buy (default 1).
drop function if exists public.buy_listing(uuid);

create or replace function public.buy_listing(
  p_listing_id uuid,
  p_quantity integer default 1
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_listing public.listings;
  v_order public.orders;
  v_qty integer;
  v_remaining integer;
begin
  if v_buyer is null then
    raise exception 'Not authenticated';
  end if;

  v_qty := greatest(1, coalesce(p_quantity, 1));

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if v_listing.status <> 'available' then
    raise exception 'Listing is not available';
  end if;

  if coalesce(v_listing.quantity_remaining, 0) < v_qty then
    raise exception 'Not enough quantity available';
  end if;

  if v_listing.seller_id = v_buyer then
    raise exception 'Cannot buy your own listing';
  end if;

  update public.listings
  set quantity_remaining = quantity_remaining - v_qty
  where id = p_listing_id
  returning quantity_remaining into v_remaining;

  if v_remaining = 0 then
    update public.listings
    set status = 'reserved'
    where id = p_listing_id;
  end if;

  insert into public.orders (
    listing_id,
    buyer_id,
    seller_id,
    status,
    price_cents,
    quantity
  )
  values (
    p_listing_id,
    v_buyer,
    v_listing.seller_id,
    'awaiting_dropoff',
    v_listing.price_cents * v_qty,
    v_qty
  )
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.buy_listing(uuid, integer) to authenticated;
