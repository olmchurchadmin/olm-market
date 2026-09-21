-- Default alert banner colors: brand magenta background, white text.
alter table public.site_banner
  alter column bg_color set default '#b62b6e',
  alter column text_color set default '#ffffff';
