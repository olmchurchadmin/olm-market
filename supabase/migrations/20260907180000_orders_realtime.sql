-- Allow clients to subscribe to order changes for the trade status dock.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then
    null;
end;
$$;
