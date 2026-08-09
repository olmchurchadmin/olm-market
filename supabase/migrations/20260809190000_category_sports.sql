-- Add sports gear category (before "other").
update public.categories
set sort_order = 8
where slug = 'other';

insert into public.categories (slug, name_ko, sort_order)
values ('sports', '스포츠용품', 7)
on conflict (slug) do update
set
  name_ko = excluded.name_ko,
  sort_order = excluded.sort_order;
