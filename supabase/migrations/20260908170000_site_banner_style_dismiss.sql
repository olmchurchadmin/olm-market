-- Banner dismiss duration + colors for the site notice strip.
alter table public.site_banner
  add column if not exists dismiss_days integer not null default 7
    check (dismiss_days >= 1 and dismiss_days <= 365),
  add column if not exists bg_color text not null default '#ffc83d',
  add column if not exists text_color text not null default '#000000';
