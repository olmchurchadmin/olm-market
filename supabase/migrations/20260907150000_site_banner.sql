-- Site-wide notice banner (singleton row) shown under the header when active.
create table if not exists public.site_banner (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  body_ko text not null default '',
  body_en text not null default '',
  cta_label_ko text not null default '',
  cta_label_en text not null default '',
  cta_url text not null default '',
  image_path text,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.site_banner (id)
values (1)
on conflict (id) do nothing;

alter table public.site_banner enable row level security;

create policy "Anyone can read site banner"
  on public.site_banner for select
  using (true);

create policy "Admins update site banner"
  on public.site_banner for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins insert site banner"
  on public.site_banner for insert to authenticated
  with check (public.is_admin());

grant select on public.site_banner to anon, authenticated;
grant insert, update on public.site_banner to authenticated;

insert into storage.buckets (id, name, public)
values ('site-banner', 'site-banner', true)
on conflict (id) do nothing;

create policy "Public read site banner images"
  on storage.objects for select
  using (bucket_id = 'site-banner');

create policy "Admins upload site banner images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-banner' and public.is_admin());

create policy "Admins update site banner images"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-banner' and public.is_admin())
  with check (bucket_id = 'site-banner' and public.is_admin());

create policy "Admins delete site banner images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-banner' and public.is_admin());
