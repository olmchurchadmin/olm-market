-- Allow admins to delete completed (or any) order rows from admin tools.
create policy "Admins delete orders"
  on public.orders for delete to authenticated
  using (public.is_admin());

grant delete on public.orders to authenticated;
