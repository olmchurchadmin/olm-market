-- Stock metrics stay absolute: ignore range + reset, exclude cancelled listings.

create or replace function public.admin_stats(p_range text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz;
  reset_at timestamptz;
  effective_since timestamptz;
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

  select b.reset_at into reset_at
  from public.admin_stats_baseline b
  where b.id = 1;

  -- Cumulative commerce metrics respect range + reset baseline.
  if since is null then
    effective_since := reset_at;
  elsif reset_at is null then
    effective_since := since;
  elsif reset_at > since then
    effective_since := reset_at;
  else
    effective_since := since;
  end if;

  select jsonb_build_object(
    'range', p_range,
    'stats_reset_at', reset_at,
    -- Live stock: always current totals (not sliced by week/month/reset).
    'new_listings', (
      select count(*) from public.listings l
      where l.status <> 'cancelled'
    ),
    'reserved', (
      select count(*) from public.listings l
      where l.status = 'reserved'
        and (effective_since is null or l.updated_at >= effective_since)
    ),
    'at_church', (
      select count(*) from public.listings l
      where l.status = 'at_church'
        and (effective_since is null or l.updated_at >= effective_since)
    ),
    'sold', (
      select count(*) from public.listings l
      where l.status = 'sold'
        and (effective_since is null or l.updated_at >= effective_since)
    ),
    'gmv_cents', (
      select coalesce(sum(o.price_cents), 0) from public.orders o
      where o.status = 'completed'
        and (effective_since is null or o.completed_at >= effective_since)
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
        and (effective_since is null or o.completed_at >= effective_since)
    ),
    'total_users', (
      select count(*) from public.profiles
    ),
    'active_users', (
      select count(distinct x.uid) from (
        select seller_id as uid from public.listings
        where status <> 'cancelled'
          and (effective_since is null or created_at >= effective_since)
        union
        select buyer_id from public.orders
        where status <> 'cancelled'
          and (effective_since is null or created_at >= effective_since)
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
