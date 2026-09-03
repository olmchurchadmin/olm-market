-- Mark-as-read went through a plain UPDATE that could match zero rows without
-- surfacing an error (RLS scope, admin-wide reads, missing service key). Move it
-- behind security-definer RPCs that always report how many rows they changed,
-- and scope notification reads strictly to the owner so everything the bell
-- shows is markable by the person looking at it.

drop policy if exists "Notifications own read" on public.notifications;

create policy "Notifications own read"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

-- Allow users to delete their own notifications (for the fallback path).
drop policy if exists "Notifications own delete" on public.notifications;
create policy "Notifications own delete"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Grant delete so fallback can work via user client.
grant delete on public.notifications to authenticated;

create or replace function public.mark_notifications_read(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;

  with updated as (
    update public.notifications
    set read_at = now()
    where user_id = auth.uid()
      and id = any (p_ids)
      and read_at is null
    returning id
  )
  select count(*) into v_count from updated;

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.mark_all_notifications_read(p_types text[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  with updated as (
    update public.notifications
    set read_at = now()
    where user_id = auth.uid()
      and read_at is null
      and (
        p_types is null
        or array_length(p_types, 1) is null
        or type = any (p_types)
      )
    returning id
  )
  select count(*) into v_count from updated;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.mark_all_notifications_read(text[]) to authenticated;

-- Delete notifications for the calling user.
create or replace function public.delete_notifications(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;

  with deleted as (
    delete from public.notifications
    where user_id = auth.uid()
      and id = any (p_ids)
    returning id
  )
  select count(*) into v_count from deleted;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.delete_notifications(uuid[]) to authenticated;

-- Repeated from 20260902220000 so a single paste of this file makes the whole
-- notification + home-pickup flow work. Safe to re-run.
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
