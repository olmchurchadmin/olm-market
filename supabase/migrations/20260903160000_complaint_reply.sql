-- Admin reply on complaints
alter table public.complaints
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid references public.profiles(id);
