-- Let admins manage listing images on any listing (needed when editing others' posts).
drop policy if exists "Sellers manage listing images" on public.listing_images;
create policy "Sellers manage listing images"
  on public.listing_images for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.seller_id = auth.uid() or public.is_admin())
    )
  );
