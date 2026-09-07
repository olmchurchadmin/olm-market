-- Admin can reset cumulative marketplace stats to "from now" without deleting data.

create table if not exists public.admin_stats_baseline (
  id integer primary key default 1 check (id = 1),
  reset_at timestamptz not null,
  reset_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_stats_baseline enable row level security;

drop policy if exists admin_stats_baseline_admin_all on public.admin_stats_baseline;
create policy admin_stats_baseline_admin_all
  on public.admin_stats_baseline
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.admin_reset_stats()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  insert into public.admin_stats_baseline (id, reset_at, reset_by, updated_at)
  values (1, v_at, auth.uid(), v_at)
  on conflict (id) do update
  set
    reset_at = excluded.reset_at,
    reset_by = excluded.reset_by,
    updated_at = excluded.updated_at;

  return v_at;
end;
$$;

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
    'new_listings', (
      select count(*) from public.listings l
      where effective_since is null or l.created_at >= effective_since
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
      select count(*) from public.profiles p
      where effective_since is null or p.created_at >= effective_since
    ),
    'active_users', (
      select count(distinct x.uid) from (
        select seller_id as uid from public.listings
        where effective_since is null or created_at >= effective_since
        union
        select buyer_id from public.orders
        where effective_since is null or created_at >= effective_since
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

grant execute on function public.admin_reset_stats() to authenticated;
grant execute on function public.admin_stats(text) to authenticated;
