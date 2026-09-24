-- Allow sellers to keep unpublished drafts (임시저장).
do $$ begin
  alter type public.listing_status add value 'draft';
exception
  when duplicate_object then null;
end $$;
