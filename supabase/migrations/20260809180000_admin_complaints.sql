-- Ensure church admin email is always admin
update public.profiles
set role = 'admin'
where lower(email) = 'olmchurchadmin@gmail.com'
  and role is distinct from 'admin';

-- Member complaints / support tickets
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists complaints_status_idx on public.complaints (status, created_at desc);
create index if not exists complaints_user_idx on public.complaints (user_id, created_at desc);

drop trigger if exists complaints_updated_at on public.complaints;
create trigger complaints_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

alter table public.complaints enable row level security;

create policy "Users insert own complaints"
  on public.complaints for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users read own complaints"
  on public.complaints for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Admins update complaints"
  on public.complaints for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.complaints to authenticated;
grant update on public.complaints to authenticated;
