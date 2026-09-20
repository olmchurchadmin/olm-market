-- Board post images (max 3 enforced in app). Public bucket for authenticated members.

create table if not exists public.board_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists board_post_images_post_idx
  on public.board_post_images (post_id, sort_order);

alter table public.board_post_images enable row level security;

drop policy if exists "Authenticated read board post images" on public.board_post_images;
create policy "Authenticated read board post images"
  on public.board_post_images for select to authenticated
  using (true);

drop policy if exists "Authors insert board post images" on public.board_post_images;
create policy "Authors insert board post images"
  on public.board_post_images for insert to authenticated
  with check (
    exists (
      select 1 from public.board_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists "Authors or staff delete board post images" on public.board_post_images;
create policy "Authors or staff delete board post images"
  on public.board_post_images for delete to authenticated
  using (
    exists (
      select 1 from public.board_posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
    )
  );

grant select on public.board_post_images to authenticated;
grant insert, delete on public.board_post_images to authenticated;

insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read board images" on storage.objects;
create policy "Public read board images"
  on storage.objects for select
  using (bucket_id = 'board-images');

drop policy if exists "Members upload board images" on storage.objects;
create policy "Members upload board images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'board-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members update board images" on storage.objects;
create policy "Members update board images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'board-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members delete board images" on storage.objects;
create policy "Members delete board images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'board-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
