-- Grr community threads — run once in Supabase → SQL Editor → New query → Run.
-- Tables: grr_members, grr_threads, grr_thread_likes, grr_comments, grr_reports (prefixed so they never clash with existing tables).
-- Security: Row Level Security on every table; counters kept by triggers so nobody can fake likes.

do $$ begin
  if to_regclass('public.grr_threads') is not null then
    raise exception 'The Grr community tables are already installed — nothing to do.';
  end if;
end $$;

-- ============ MEMBERS (one profile per signed-up user) ============
create table public.grr_members (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 40),
  avatar_url   text,
  role         text not null default 'member' check (role in ('member', 'admin')),
  created_at   timestamptz not null default now()
);

-- ============ THREADS (short posts: facts, history, culture, stories…) ============
create table public.grr_threads (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.grr_members(id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 120),
  body          text not null check (char_length(body) between 10 and 1500),
  category      text not null default 'fact' check (category in ('fact', 'history', 'culture', 'science', 'story', 'tip')),
  animal        text not null default 'all' check (animal in ('all', 'dog', 'cat', 'rabbit', 'rodent', 'bird', 'fish', 'reptile', 'horse', 'ferret', 'farm')),
  is_official   boolean not null default false,   -- posted by Grr (admins only)
  status        text not null default 'published' check (status in ('published', 'hidden')),
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index grr_threads_feed_idx on public.grr_threads (status, created_at desc);
create index grr_threads_top_idx on public.grr_threads (status, like_count desc);
create index grr_threads_author_idx on public.grr_threads (author_id);

-- ============ LIKES (one per user per thread) ============
create table public.grr_thread_likes (
  thread_id  uuid not null references public.grr_threads(id) on delete cascade,
  user_id    uuid not null references public.grr_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create index grr_thread_likes_user_idx on public.grr_thread_likes (user_id);

-- ============ COMMENTS ============
create table public.grr_comments (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.grr_threads(id) on delete cascade,
  author_id  uuid not null references public.grr_members(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 600),
  status     text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
create index grr_comments_thread_idx on public.grr_comments (thread_id, created_at);

-- ============ REPORTS (visitors flag abuse; admins review) ============
create table public.grr_reports (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid references public.grr_threads(id) on delete cascade,
  comment_id  uuid references public.grr_comments(id) on delete cascade,
  reporter_id uuid not null references public.grr_members(id) on delete cascade,
  reason      text not null check (char_length(reason) between 3 and 300),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  check (thread_id is not null or comment_id is not null),
  unique (reporter_id, thread_id, comment_id)
);

-- ============ HELPERS & TRIGGERS ============
create function public.grr_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.grr_members where id = auth.uid() and role = 'admin')
$$;

-- Create a profile automatically at sign-up (username from the e-mail, made unique).
create function public.grr_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := coalesce(nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''), 'member');
  candidate text := left(base, 18);
begin
  if char_length(candidate) < 3 then candidate := candidate || 'grr'; end if;
  while exists (select 1 from public.grr_members where username = candidate) loop
    candidate := left(base, 18) || floor(random() * 10000)::int;
  end loop;
  insert into public.grr_members (id, username, display_name, avatar_url)
  values (new.id, candidate, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;
create trigger grr_on_auth_user_created after insert on auth.users
  for each row execute function public.grr_handle_new_user();

-- Keep like_count / comment_count exact.
create function public.grr_bump_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.grr_threads set like_count = like_count + 1 where id = new.thread_id;
  else update public.grr_threads set like_count = greatest(like_count - 1, 0) where id = old.thread_id; end if;
  return null;
end $$;
create trigger thread_likes_count after insert or delete on public.grr_thread_likes
  for each row execute function public.grr_bump_like_count();

create function public.grr_bump_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.grr_threads set comment_count = comment_count + 1 where id = new.thread_id;
  else update public.grr_threads set comment_count = greatest(comment_count - 1, 0) where id = old.thread_id; end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.grr_comments
  for each row execute function public.grr_bump_comment_count();

-- Members can't set protected columns themselves (counters, official badge, role).
create function public.grr_protect_thread_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Updates made by the counter triggers above (nested trigger) must go through untouched.
  if pg_trigger_depth() > 1 then return new; end if;
  -- No signed-in visitor (SQL editor, service role) or an admin: trusted.
  if auth.uid() is null or public.grr_is_admin() then new.updated_at := now(); return new; end if;
  if tg_op = 'INSERT' then
    new.is_official := false; new.status := 'published'; new.like_count := 0; new.comment_count := 0;
  else
    new.is_official := old.is_official; new.status := old.status; new.like_count := old.like_count;
    new.comment_count := old.comment_count; new.author_id := old.author_id; new.updated_at := now();
  end if;
  return new;
end $$;
create trigger threads_protect before insert or update on public.grr_threads
  for each row execute function public.grr_protect_thread_columns();

create function public.grr_protect_member_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Only admins (or you, from the SQL editor) can change roles.
  if auth.uid() is not null and not public.grr_is_admin() then new.role := old.role; end if;
  return new;
end $$;
create trigger profiles_protect before update on public.grr_members
  for each row execute function public.grr_protect_member_role();

-- Anti-spam: at most 10 threads and 60 comments per user per day.
create function public.grr_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.grr_is_admin() then return new; end if;
  if tg_table_name = 'grr_threads' and (select count(*) from public.grr_threads where author_id = new.author_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Daily limit reached: 10 threads per day.';
  end if;
  if tg_table_name = 'grr_comments' and (select count(*) from public.grr_comments where author_id = new.author_id and created_at > now() - interval '1 day') >= 60 then
    raise exception 'Daily limit reached: 60 comments per day.';
  end if;
  return new;
end $$;
create trigger threads_rate_limit before insert on public.grr_threads for each row execute function public.grr_rate_limit();
create trigger comments_rate_limit before insert on public.grr_comments for each row execute function public.grr_rate_limit();

-- ============ ROW LEVEL SECURITY ============
alter table public.grr_members     enable row level security;
alter table public.grr_threads      enable row level security;
alter table public.grr_thread_likes enable row level security;
alter table public.grr_comments     enable row level security;
alter table public.grr_reports      enable row level security;

create policy "profiles are public"      on public.grr_members for select using (true);
create policy "edit own profile"         on public.grr_members for update using (id = auth.uid());

create policy "read published threads"   on public.grr_threads for select using (status = 'published' or author_id = auth.uid() or public.grr_is_admin());
create policy "post own threads"         on public.grr_threads for insert with check (author_id = auth.uid());
create policy "edit own threads"         on public.grr_threads for update using (author_id = auth.uid() or public.grr_is_admin());
create policy "delete own threads"       on public.grr_threads for delete using (author_id = auth.uid() or public.grr_is_admin());

create policy "likes are public"         on public.grr_thread_likes for select using (true);
create policy "like as yourself"         on public.grr_thread_likes for insert with check (user_id = auth.uid());
create policy "unlike as yourself"       on public.grr_thread_likes for delete using (user_id = auth.uid());

create policy "read published comments"  on public.grr_comments for select using (status = 'published' or author_id = auth.uid() or public.grr_is_admin());
create policy "comment as yourself"      on public.grr_comments for insert with check (author_id = auth.uid());
create policy "moderate comments"        on public.grr_comments for update using (public.grr_is_admin());
create policy "delete own comments"      on public.grr_comments for delete using (author_id = auth.uid() or public.grr_is_admin());

create policy "report as yourself"       on public.grr_reports for insert with check (reporter_id = auth.uid());
create policy "admins read reports"      on public.grr_reports for select using (public.grr_is_admin());
create policy "admins resolve reports"   on public.grr_reports for update using (public.grr_is_admin());

-- ============ MAKE YOURSELF ADMIN (after your first sign-in on the site) ============
-- update public.grr_members set role = 'admin' where username = 'your_username';
