-- Add sacred items as the first category; keep a stable order for the rest.
insert into public.categories (slug, name_ko, sort_order)
values ('sacred', '성물', 1)
on conflict (slug) do update
set
  name_ko = excluded.name_ko,
  sort_order = excluded.sort_order;

update public.categories set sort_order = 2 where slug = 'furniture';
update public.categories set sort_order = 3 where slug = 'electronics';
update public.categories set sort_order = 4 where slug = 'clothing';
update public.categories set sort_order = 5 where slug = 'books';
update public.categories set sort_order = 6 where slug = 'household';
update public.categories set sort_order = 7 where slug = 'kids';
update public.categories set sort_order = 8 where slug = 'sports';
update public.categories set sort_order = 9 where slug = 'other';
