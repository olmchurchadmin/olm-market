-- Step 2: staff helpers + keep member profile updates full-admin only.
create or replace function public.is_full_admin()
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

-- Staff = admin or manager (operational admin console + related RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'manager')
  );
$$;

drop policy if exists "Admins update any profile" on public.profiles;
drop policy if exists "Full admins update any profile" on public.profiles;
create policy "Full admins update any profile"
  on public.profiles for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin());

grant execute on function public.is_full_admin() to authenticated;
