-- Add donation total to admin_stats (church share of completed sales).
create or replace function public.admin_stats(p_range text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  since := case p_range
    when 'day' then date_trunc('day', now())
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    when 'year' then date_trunc('year', now())
    else null
  end;

  select jsonb_build_object(
    'range', p_range,
    'new_listings', (
      select count(*) from public.listings l
      where since is null or l.created_at >= since
    ),
    'reserved', (
      select count(*) from public.listings l
      where l.status = 'reserved'
        and (since is null or l.updated_at >= since)
    ),
    'at_church', (
      select count(*) from public.listings l
      where l.status = 'at_church'
        and (since is null or l.updated_at >= since)
    ),
    'sold', (
      select count(*) from public.listings l
      where l.status = 'sold'
        and (since is null or l.updated_at >= since)
    ),
    'gmv_cents', (
      select coalesce(sum(o.price_cents), 0) from public.orders o
      where o.status = 'completed'
        and (since is null or o.completed_at >= since)
    ),
    'donation_cents', (
      select coalesce(
        sum(
          (o.price_cents::bigint * coalesce(l.donation_percent, 100)::bigint) / 100
        ),
        0
      )
      from public.orders o
      join public.listings l on l.id = o.listing_id
      where o.status = 'completed'
        and (since is null or o.completed_at >= since)
    ),
    'active_users', (
      select count(distinct x.uid) from (
        select seller_id as uid from public.listings
        where since is null or created_at >= since
        union
        select buyer_id from public.orders
        where since is null or created_at >= since
      ) x
    ),
    'orders_awaiting_dropoff', (
      select count(*) from public.orders where status = 'awaiting_dropoff'
    ),
    'orders_ready_for_pickup', (
      select count(*) from public.orders where status = 'ready_for_pickup'
    )
  ) into result;

  return result;
end;
$$;
