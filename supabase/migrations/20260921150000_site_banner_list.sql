-- Allow multiple scheduled alert banners (was singleton id = 1).
alter table public.site_banner
  drop constraint if exists site_banner_id_check;

create sequence if not exists public.site_banner_id_seq;

select setval(
  'public.site_banner_id_seq',
  greatest(coalesce((select max(id) from public.site_banner), 1), 1)
);

alter table public.site_banner
  alter column id set default nextval('public.site_banner_id_seq');

alter sequence public.site_banner_id_seq owned by public.site_banner.id;

drop policy if exists "Admins delete site banner" on public.site_banner;
create policy "Admins delete site banner"
  on public.site_banner for delete to authenticated
  using (public.is_admin());

grant delete on table public.site_banner to authenticated;

create index if not exists site_banner_schedule_idx
  on public.site_banner (enabled desc, starts_at desc nulls last, updated_at desc);
