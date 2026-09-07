-- Quantity (multi-unit) + item condition on listings.
-- One buy takes one unit; listing stays available while quantity_remaining > 0.
-- Multiple open orders per listing are allowed.

create type public.item_condition as enum ('new', 'used');

alter table public.listings
  add column if not exists item_condition public.item_condition not null default 'used',
  add column if not exists quantity_total integer not null default 1,
  add column if not exists quantity_remaining integer not null default 1;

alter table public.listings
  drop constraint if exists listings_quantity_total_check,
  drop constraint if exists listings_quantity_remaining_check,
  drop constraint if exists listings_quantity_remaining_lte_total;

alter table public.listings
  add constraint listings_quantity_total_check check (quantity_total >= 1),
  add constraint listings_quantity_remaining_check check (quantity_remaining >= 0),
  add constraint listings_quantity_remaining_lte_total
    check (quantity_remaining <= quantity_total);

-- Allow multiple orders against the same listing (one order per unit sold).
alter table public.orders drop constraint if exists orders_listing_id_key;

create or replace function public.buy_listing(p_listing_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_listing public.listings;
  v_order public.orders;
  v_remaining integer;
begin
  if v_buyer is null then
    raise exception 'Not authenticated';
  end if;

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

  if coalesce(v_listing.quantity_remaining, 0) < 1 then
    raise exception 'Listing is not available';
  end if;

  if v_listing.seller_id = v_buyer then
    raise exception 'Cannot buy your own listing';
  end if;

  update public.listings
  set quantity_remaining = quantity_remaining - 1
  where id = p_listing_id
  returning quantity_remaining into v_remaining;

  if v_remaining = 0 then
    update public.listings
    set status = 'reserved'
    where id = p_listing_id;
  end if;

  insert into public.orders (listing_id, buyer_id, seller_id, status, price_cents)
  values (p_listing_id, v_buyer, v_listing.seller_id, 'awaiting_dropoff', v_listing.price_cents)
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.listing_has_open_orders(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.listing_id = p_listing_id
      and o.status in ('awaiting_dropoff', 'ready_for_pickup', 'reserved')
  );
$$;

create or replace function public.admin_mark_dropoff(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_listing public.listings;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.orders
  set status = 'ready_for_pickup', dropoff_at = now()
  where id = p_order_id and status = 'awaiting_dropoff'
  returning * into v_order;

  if not found then
    raise exception 'Order not eligible for dropoff';
  end if;

  select * into v_listing
  from public.listings
  where id = v_order.listing_id;

  -- Only move listing status when no units remain for sale.
  if v_listing.quantity_remaining = 0 then
    update public.listings
    set status = 'at_church'
    where id = v_order.listing_id;
  end if;

  return v_order;
end;
$$;

create or replace function public.admin_mark_pickup_complete(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_listing public.listings;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.orders
  set status = 'completed', completed_at = now()
  where id = p_order_id and status = 'ready_for_pickup'
  returning * into v_order;

  if not found then
    raise exception 'Order not eligible for completion';
  end if;

  select * into v_listing
  from public.listings
  where id = v_order.listing_id;

  if v_listing.quantity_remaining = 0
     and not public.listing_has_open_orders(v_order.listing_id) then
    update public.listings
    set status = 'sold'
    where id = v_order.listing_id;
  end if;

  return v_order;
end;
$$;

create or replace function public.admin_mark_trade_complete(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_listing public.listings;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.orders
  set
    status = 'completed',
    completed_at = now(),
    dropoff_at = coalesce(dropoff_at, now())
  where id = p_order_id
    and status in ('awaiting_dropoff', 'ready_for_pickup')
  returning * into v_order;

  if not found then
    raise exception 'Order not eligible for completion';
  end if;

  select * into v_listing
  from public.listings
  where id = v_order.listing_id;

  if v_listing.quantity_remaining = 0
     and not public.listing_has_open_orders(v_order.listing_id) then
    update public.listings
    set status = 'sold'
    where id = v_order.listing_id;
  end if;

  return v_order;
end;
$$;

grant execute on function public.buy_listing(uuid) to authenticated;
grant execute on function public.admin_mark_dropoff(uuid) to authenticated;
grant execute on function public.admin_mark_pickup_complete(uuid) to authenticated;
grant execute on function public.admin_mark_trade_complete(uuid) to authenticated;
grant execute on function public.listing_has_open_orders(uuid) to authenticated;
