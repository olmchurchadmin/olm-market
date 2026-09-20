-- Track when each member last viewed the community board (for unread badge).

alter table public.profiles
  add column if not exists board_last_seen_at timestamptz;

comment on column public.profiles.board_last_seen_at is
  'Last time the user opened the community board; used for new-post unread badge.';
