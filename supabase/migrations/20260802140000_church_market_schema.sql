-- Church Market marketplace schema
create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'admin');
create type public.listing_status as enum ('available', 'reserved', 'at_church', 'sold', 'cancelled');
create type public.order_status as enum (
  'reserved',
  'awaiting_dropoff',
  'ready_for_pickup',
  'completed',
  'cancelled'
);
create type public.notification_channel as enum ('in_app', 'email', 'kakao');
create type public.notification_job_status as enum (
  'pending',
  'sent',
  'failed',
  'skipped',
  'pending_credentials'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  kakao_id text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ko text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  title text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  status public.listing_status not null default 'available',
  cover_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_status_idx on public.listings (status);
create index listings_category_idx on public.listings (category_id);
create index listings_seller_idx on public.listings (seller_id);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'reserved',
  price_cents integer not null check (price_cents >= 0),
  reserved_at timestamptz not null default now(),
  dropoff_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_idx on public.orders (buyer_id);
create index orders_seller_idx on public.orders (seller_id);
create index orders_status_idx on public.orders (status);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  channel public.notification_channel not null,
  recipient text not null,
  subject text,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_job_status not null default 'pending',
  error text,
  related_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

insert into public.categories (slug, name_ko, sort_order) values
  ('sacred', '성물', 1),
  ('furniture', '가구', 2),
  ('electronics', '가전', 3),
  ('clothing', '의류', 4),
  ('books', '도서', 5),
  ('household', '생활용품', 6),
  ('kids', '유아/아동', 7),
  ('sports', '스포츠용품', 8),
  ('other', '기타', 9);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role := 'user';
begin
  if lower(coalesce(new.email, '')) = 'olmchurchadmin@gmail.com' then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    assigned_role
  );

  if assigned_role = 'admin' then
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

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

  if v_listing.seller_id = v_buyer then
    raise exception 'Cannot buy your own listing';
  end if;

  update public.listings
  set status = 'reserved'
  where id = p_listing_id;

  insert into public.orders (listing_id, buyer_id, seller_id, status, price_cents)
  values (p_listing_id, v_buyer, v_listing.seller_id, 'awaiting_dropoff', v_listing.price_cents)
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.admin_mark_dropoff(p_order_id uuid)
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
  set status = 'ready_for_pickup', dropoff_at = now()
  where id = p_order_id and status = 'awaiting_dropoff'
  returning * into v_order;

  if not found then
    raise exception 'Order not eligible for dropoff';
  end if;

  update public.listings
  set status = 'at_church'
  where id = v_order.listing_id;

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

  update public.listings
  set status = 'sold'
  where id = v_order.listing_id;

  return v_order;
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

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.orders enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_jobs enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated
  using (true);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "Admins update any profile"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Categories are public read"
  on public.categories for select
  using (true);

create policy "Listings public read"
  on public.listings for select
  using (true);

create policy "Sellers insert listings"
  on public.listings for insert to authenticated
  with check (seller_id = auth.uid());

create policy "Sellers update own available listings"
  on public.listings for update to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());

create policy "Listing images public read"
  on public.listing_images for select
  using (true);

create policy "Sellers manage listing images"
  on public.listing_images for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create policy "Sellers delete listing images"
  on public.listing_images for delete to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.seller_id = auth.uid() or public.is_admin())
    )
  );

create policy "Orders visible to parties and admin"
  on public.orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

create policy "Notifications own read"
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Notifications own update"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admin read notification jobs"
  on public.notification_jobs for select to authenticated
  using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.listings to anon, authenticated;
grant select on public.listing_images to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update on public.listings to authenticated;
grant insert, delete on public.listing_images to authenticated;
grant select on public.orders to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.notification_jobs to authenticated;
grant execute on function public.buy_listing(uuid) to authenticated;
grant execute on function public.admin_mark_dropoff(uuid) to authenticated;
grant execute on function public.admin_mark_pickup_complete(uuid) to authenticated;
grant execute on function public.admin_stats(text) to authenticated;
grant execute on function public.is_admin() to authenticated;

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "Public read listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Authenticated upload listing images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners update listing images"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owners delete listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
