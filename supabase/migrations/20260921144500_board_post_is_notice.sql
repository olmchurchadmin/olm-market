-- Pin board posts marked as notices to the top of the list.
alter table public.board_posts
  add column if not exists is_notice boolean not null default false;

create index if not exists board_posts_notice_created_idx
  on public.board_posts (is_notice desc, created_at desc);

comment on column public.board_posts.is_notice is
  'When true, post is pinned to the top of the board list as a notice.';
