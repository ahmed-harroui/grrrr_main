-- Threads about every kind of pet, not only dogs and cats (lib/community/limits.ts ANIMALS).
-- Safe to run again. Run after schema.sql.

alter table public.grr_threads drop constraint if exists grr_threads_animal_check;
alter table public.grr_threads add constraint grr_threads_animal_check
  check (animal in ('all', 'dog', 'cat', 'rabbit', 'rodent', 'bird', 'fish', 'reptile', 'horse', 'ferret', 'farm'));
