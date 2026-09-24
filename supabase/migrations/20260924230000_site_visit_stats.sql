-- Daily visitor aggregates (desktop / mobile) for admin stats.

create table if not exists public.site_visit_daily (
  day date not null,
  device text not null check (device in ('desktop', 'mobile')),
  visits bigint not null default 0 check (visits >= 0),
  unique_visitors bigint not null default 0 check (unique_visitors >= 0),
  primary key (day, device)
);

alter table public.site_visit_daily enable row level security;

drop policy if exists "Admins can read site visits" on public.site_visit_daily;
create policy "Admins can read site visits"
  on public.site_visit_daily
  for select
  to authenticated
  using (public.is_admin());

-- Increment today's counters. Call only from service role / trusted API.
create or replace function public.record_site_visit(
  p_device text,
  p_is_unique boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  device_key text;
begin
  device_key := case
    when lower(coalesce(p_device, '')) in ('mobile', 'tablet', 'phone') then 'mobile'
    else 'desktop'
  end;

  insert into public.site_visit_daily as v (day, device, visits, unique_visitors)
  values (
    (timezone('America/New_York', now()))::date,
    device_key,
    1,
    case when p_is_unique then 1 else 0 end
  )
  on conflict (day, device) do update
  set
    visits = v.visits + 1,
    unique_visitors = v.unique_visitors + case when p_is_unique then 1 else 0 end;
end;
$$;

revoke all on function public.record_site_visit(text, boolean) from public;
grant execute on function public.record_site_visit(text, boolean) to service_role;

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
  visit_since date;
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

  -- Visitor stats follow the selected calendar range only (not reset).
  visit_since := case p_range
    when 'day' then (timezone('America/New_York', now()))::date
    when 'week' then (date_trunc('week', timezone('America/New_York', now())))::date
    when 'month' then (date_trunc('month', timezone('America/New_York', now())))::date
    when 'year' then (date_trunc('year', timezone('America/New_York', now())))::date
    else null
  end;

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
    ),
    'visitors_desktop', (
      select coalesce(sum(v.unique_visitors), 0)
      from public.site_visit_daily v
      where v.device = 'desktop'
        and (visit_since is null or v.day >= visit_since)
    ),
    'visitors_mobile', (
      select coalesce(sum(v.unique_visitors), 0)
      from public.site_visit_daily v
      where v.device = 'mobile'
        and (visit_since is null or v.day >= visit_since)
    ),
    'visitors_total', (
      select coalesce(sum(v.unique_visitors), 0)
      from public.site_visit_daily v
      where visit_since is null or v.day >= visit_since
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_stats(text) to authenticated;
