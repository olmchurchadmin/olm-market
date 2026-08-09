-- Nickname + anonymous listing display for profiles
alter table public.profiles
  add column if not exists nickname text,
  add column if not exists is_anonymous boolean not null default false;

comment on column public.profiles.nickname is 'Public display name on marketplace when not anonymous';
comment on column public.profiles.is_anonymous is 'When true, marketplace shows seller as 익명';
