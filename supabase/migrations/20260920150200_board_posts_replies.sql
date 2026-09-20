-- Free community board: posts + replies for registered members.

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_posts_created_idx
  on public.board_posts (created_at desc);
create index if not exists board_posts_author_idx
  on public.board_posts (author_id, created_at desc);

create table if not exists public.board_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_replies_post_idx
  on public.board_replies (post_id, created_at);

drop trigger if exists board_posts_set_updated_at on public.board_posts;
create trigger board_posts_set_updated_at
  before update on public.board_posts
  for each row execute function public.set_updated_at();

drop trigger if exists board_replies_set_updated_at on public.board_replies;
create trigger board_replies_set_updated_at
  before update on public.board_replies
  for each row execute function public.set_updated_at();

alter table public.board_posts enable row level security;
alter table public.board_replies enable row level security;

-- Anyone signed in can read the board.
drop policy if exists "Authenticated read board posts" on public.board_posts;
create policy "Authenticated read board posts"
  on public.board_posts for select to authenticated
  using (true);

drop policy if exists "Authenticated read board replies" on public.board_replies;
create policy "Authenticated read board replies"
  on public.board_replies for select to authenticated
  using (true);

-- Members create their own posts/replies.
drop policy if exists "Members insert board posts" on public.board_posts;
create policy "Members insert board posts"
  on public.board_posts for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Members insert board replies" on public.board_replies;
create policy "Members insert board replies"
  on public.board_replies for insert to authenticated
  with check (author_id = auth.uid());

-- Authors edit/delete own; staff (admin/superadmin) may delete any.
drop policy if exists "Authors update own board posts" on public.board_posts;
create policy "Authors update own board posts"
  on public.board_posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "Authors or staff delete board posts" on public.board_posts;
create policy "Authors or staff delete board posts"
  on public.board_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Authors update own board replies" on public.board_replies;
create policy "Authors update own board replies"
  on public.board_replies for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "Authors or staff delete board replies" on public.board_replies;
create policy "Authors or staff delete board replies"
  on public.board_replies for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());
