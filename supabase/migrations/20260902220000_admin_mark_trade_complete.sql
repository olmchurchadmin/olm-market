-- Allow admin to confirm a trade complete from either open status
-- (church pipeline mid-flow or seller-location direct complete).

create or replace function public.admin_mark_trade_complete(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
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

  update public.listings
  set status = 'sold'
  where id = v_order.listing_id;

  return v_order;
end;
$$;

grant execute on function public.admin_mark_trade_complete(uuid) to authenticated;
