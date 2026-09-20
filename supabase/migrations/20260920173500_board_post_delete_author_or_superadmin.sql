-- Authors may delete own posts; superadmin may delete any.

drop policy if exists "Authors or staff delete board posts" on public.board_posts;
drop policy if exists "Superadmins delete board posts" on public.board_posts;
drop policy if exists "Authors or superadmins delete board posts" on public.board_posts;
create policy "Authors or superadmins delete board posts"
  on public.board_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_full_admin());
