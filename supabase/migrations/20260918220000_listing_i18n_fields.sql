-- Bilingual listing title/description for locale display.
alter table public.listings
  add column if not exists title_ko text,
  add column if not exists title_en text,
  add column if not exists description_ko text,
  add column if not exists description_en text;

comment on column public.listings.title is 'Canonical seller-entered title';
comment on column public.listings.description is 'Canonical seller-entered description';
comment on column public.listings.title_ko is 'Korean display title (original or translated)';
comment on column public.listings.title_en is 'English display title (original or translated)';
comment on column public.listings.description_ko is 'Korean display description';
comment on column public.listings.description_en is 'English display description';

-- Seed from existing monolingual content (language detection deferred to app).
update public.listings
set
  title_ko = coalesce(nullif(trim(title_ko), ''), title),
  description_ko = coalesce(nullif(trim(description_ko), ''), description)
where title_ko is null or description_ko is null;
