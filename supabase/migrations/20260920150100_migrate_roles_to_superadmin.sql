-- Remap roles: former admin → superadmin, former manager → admin.
-- Staff = admin | superadmin. Member CRUD = superadmin only.

update public.profiles
set role = 'superadmin'
where role = 'admin';

update public.profiles
set role = 'admin'
where role = 'manager';

create or replace function public.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'superadmin')
  );
$$;

-- Seed account stays top-level admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role := 'user';
  meta_name text;
  initial_nickname text;
begin
  if lower(coalesce(new.email, '')) = 'olmchurchadmin@gmail.com' then
    assigned_role := 'superadmin';
  end if;

  meta_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  );
  initial_nickname := meta_name;

  insert into public.profiles (id, email, full_name, nickname, role)
  values (new.id, new.email, null, initial_nickname, assigned_role)
  on conflict (id) do update
    set email = excluded.email,
        nickname = coalesce(public.profiles.nickname, excluded.nickname);

  if assigned_role = 'superadmin' then
    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'superadmin')
    where id = new.id;
  end if;

  return new;
end;
$$;
