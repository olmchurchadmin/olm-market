-- Prefer Kakao nickname/name when creating profiles for social sign-in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role := 'user';
  display_name text;
begin
  if lower(coalesce(new.email, '')) = 'olmchurchadmin@gmail.com' then
    assigned_role := 'admin';
  end if;

  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(coalesce(new.email, ''), '@', 1),
    'Member'
  );

  insert into public.profiles (id, email, full_name, nickname, role)
  values (
    new.id,
    new.email,
    display_name,
    nullif(display_name, ''),
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
