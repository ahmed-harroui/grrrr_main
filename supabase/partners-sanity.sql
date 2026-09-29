-- Link the Grr Care `partners` table to the Sanity Studio — run once in Supabase → SQL Editor.
-- Safe to re-run. Existing rows are untouched: only rows with a sanity_id are managed by the Studio.
alter table public.partners add column if not exists sanity_id text;
create unique index if not exists partners_sanity_id_key on public.partners (sanity_id);
