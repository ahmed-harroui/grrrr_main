// Safe to import from client components (no server-only code). Must match supabase/schema.sql.
export const THREAD_CATEGORIES = {
  fact: 'Fun fact',
  history: 'History',
  culture: 'Culture',
  science: 'Science',
  story: 'Story',
  tip: 'Tip',
} as const
export type ThreadCategory = keyof typeof THREAD_CATEGORIES

export const ANIMALS = { all: 'All pets', dog: 'Dogs', cat: 'Cats' } as const
export type Animal = keyof typeof ANIMALS

export const LIMITS = { title: 120, body: 1500, comment: 600 }
