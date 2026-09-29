-- Grr: guides and the most upvoted community threads become knowledge for the GRRR Care assistant.
-- Run in Supabase → SQL Editor → New query → Run (the project shared by the site and the app). Safe to run again.
-- Needs schema.sql (community tables) and the app's knowledge base (knowledge_documents) to be installed.
-- Only the knowledge_documents columns the app itself writes are used: id, title, category, species, content, is_published.

-- 1. A guide shared on the site keeps a link to its guide: one thread per guide.
alter table public.grr_threads add column if not exists guide_slug text unique;

-- 2. The assistant only reads published knowledge entries.
alter table public.knowledge_documents add column if not exists is_published boolean not null default true;

-- 3. A community thread becomes knowledge once it has enough upvotes, and stops being knowledge when it
--    drops below, is hidden or deleted. Guide threads are skipped: the guide itself is already knowledge.
--    Change min_votes below (and in step 4) to make it easier or harder, then run this file again.
create or replace function public.grr_sync_thread_knowledge() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  min_votes constant integer := 5;
  kid text;
begin
  if tg_op = 'DELETE' then
    delete from public.knowledge_documents where id = 'thread-' || old.id;
    return old;
  end if;
  kid := 'thread-' || new.id;
  if new.status <> 'published' or new.like_count < min_votes or new.guide_slug is not null then
    delete from public.knowledge_documents where id = kid;
  -- Only rewrite the entry when it (re)qualifies or its text changes: every rewrite resets the assistant's prompt cache
  elsif tg_op = 'INSERT' or old.like_count < min_votes or old.status <> 'published'
     or old.title <> new.title or old.body <> new.body or old.animal <> new.animal then
    insert into public.knowledge_documents (id, title, category, species, content, is_published)
    values (
      kid, new.title, 'community',
      case when new.animal = 'all' then '[]'::jsonb else jsonb_build_array(new.animal) end,
      new.body || E'\n\n(Community post from the Grr website, upvoted by members. Not reviewed by a vet.)',
      true
    )
    on conflict (id) do update set
      title = excluded.title, species = excluded.species, content = excluded.content, is_published = true;
  end if;
  return new;
end $$;

drop trigger if exists grr_threads_knowledge on public.grr_threads;
create trigger grr_threads_knowledge after insert or update or delete on public.grr_threads
  for each row execute function public.grr_sync_thread_knowledge();

-- 4. Threads that already have enough upvotes (threshold must match min_votes above).
insert into public.knowledge_documents (id, title, category, species, content, is_published)
select
  'thread-' || t.id, t.title, 'community',
  case when t.animal = 'all' then '[]'::jsonb else jsonb_build_array(t.animal) end,
  t.body || E'\n\n(Community post from the Grr website, upvoted by members. Not reviewed by a vet.)',
  true
from public.grr_threads t
where t.status = 'published' and t.like_count >= 5 and t.guide_slug is null
on conflict (id) do nothing;

-- 5. Accounts created before the community existed (e.g. in the GRRR Care app, same project) have no member
--    profile, so the site doesn't recognise them. Create one for each, with a username taken from the e-mail.
insert into public.grr_members (id, username, display_name)
select
  u.id,
  left(coalesce(nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''), 'member'), 14)
    || '_' || left(replace(u.id::text, '-', ''), 6),
  u.raw_user_meta_data ->> 'full_name'
from auth.users u
where u.email is not null and not exists (select 1 from public.grr_members m where m.id = u.id)
on conflict do nothing;

-- 6. Guide threads are posted in the name of the first admin. Make yourself admin: replace the e-mail below
--    with the one you sign in with, remove the two dashes at the start of the line, and run it.
-- update public.grr_members set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
