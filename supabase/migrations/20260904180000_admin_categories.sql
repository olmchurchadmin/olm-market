-- Admin category management + optional English label.
alter table public.categories
  add column if not exists name_en text;

create policy "Admins insert categories"
  on public.categories for insert to authenticated
  with check (public.is_admin());

create policy "Admins update categories"
  on public.categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete categories"
  on public.categories for delete to authenticated
  using (public.is_admin());

grant insert, update, delete on public.categories to authenticated;
