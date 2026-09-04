-- Allow admins to permanently delete complaints.
create policy "Admins delete complaints"
  on public.complaints for delete to authenticated
  using (public.is_admin());

grant delete on public.complaints to authenticated;
