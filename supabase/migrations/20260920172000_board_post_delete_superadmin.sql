-- Board post delete: superadmin only (authors keep edit; replies unchanged).

drop policy if exists "Authors or staff delete board posts" on public.board_posts;
drop policy if exists "Superadmins delete board posts" on public.board_posts;
create policy "Superadmins delete board posts"
  on public.board_posts for delete to authenticated
  using (public.is_full_admin());
