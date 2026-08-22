-- Optional email for trade/listing alerts (may differ from login email).
alter table public.profiles
  add column if not exists notification_email text;
