-- Buyers can confirm pickup (complete trade) from either open status,
-- for both church and seller_location pickup methods.

create or replace function public.admin_mark_pickup_complete(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_listing public.listings;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if not (
    public.is_admin()
    or v_order.buyer_id = v_uid
  ) then
    raise exception 'Not allowed to confirm pickup';
  end if;

  if v_order.status not in ('awaiting_dropoff', 'ready_for_pickup') then
    raise exception 'Order not eligible for completion';
  end if;

  select * into v_listing
  from public.listings
  where id = v_order.listing_id;

  update public.orders
  set
    status = 'completed',
    completed_at = now(),
    dropoff_at = coalesce(dropoff_at, now())
  where id = p_order_id
  returning * into v_order;

  if v_listing.quantity_remaining = 0
     and not public.listing_has_open_orders(v_order.listing_id) then
    update public.listings
    set status = 'sold'
    where id = v_order.listing_id;
  end if;

  return v_order;
end;
$$;

grant execute on function public.admin_mark_pickup_complete(uuid) to authenticated;
