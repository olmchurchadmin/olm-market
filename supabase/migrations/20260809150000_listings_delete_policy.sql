-- Allow sellers to delete their own listings (orders still restrict via FK)
create policy "Sellers delete own listings"
  on public.listings for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

grant delete on public.listings to authenticated;
