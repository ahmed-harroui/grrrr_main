import { supabaseConfigured } from '../supabase/env'
import { createClient } from '../supabase/server'
import { THREAD_CATEGORIES, type Animal, type ThreadCategory } from './limits'

export { ANIMALS, LIMITS, THREAD_CATEGORIES, type Animal, type ThreadCategory } from './limits'

export type Author = { username: string; display_name: string | null; avatar_url: string | null }
export type Thread = {
  id: string
  author_id: string
  title: string
  body: string
  category: ThreadCategory
  animal: Animal
  is_official: boolean
  like_count: number
  comment_count: number
  created_at: string
  author: Author | null
  liked: boolean
}
export type Comment = { id: string; author_id: string; body: string; created_at: string; author: Author | null }

const THREAD_COLUMNS = 'id, author_id, title, body, category, animal, is_official, like_count, comment_count, created_at, author:grr_members!grr_threads_author_id_fkey(username, display_name, avatar_url)'

async function withLikes(supabase: Awaited<ReturnType<typeof createClient>>, rows: Omit<Thread, 'liked'>[]): Promise<Thread[]> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId || rows.length === 0) return rows.map((t) => ({ ...t, liked: false }))
  const { data: likes } = await supabase.from('grr_thread_likes').select('thread_id').eq('user_id', userId).in('thread_id', rows.map((t) => t.id))
  const liked = new Set((likes ?? []).map((l) => l.thread_id))
  return rows.map((t) => ({ ...t, liked: liked.has(t.id) }))
}

export async function listThreads({ sort = 'new', category, limit = 30 }: { sort?: 'new' | 'top'; category?: string; limit?: number } = {}): Promise<Thread[]> {
  if (!supabaseConfigured) return []
  const supabase = await createClient()
  let query = supabase.from('grr_threads').select(THREAD_COLUMNS).eq('status', 'published')
  if (category && category in THREAD_CATEGORIES) query = query.eq('category', category)
  query = sort === 'top' ? query.order('like_count', { ascending: false }).order('created_at', { ascending: false }) : query.order('created_at', { ascending: false })
  const { data, error } = await query.limit(limit)
  if (error) {
    console.error('listThreads:', error.message) // e.g. schema not installed yet — show an empty feed
    return []
  }
  return withLikes(supabase, (data ?? []) as unknown as Omit<Thread, 'liked'>[])
}

export async function getThread(id: string): Promise<{ thread: Thread; comments: Comment[] } | null> {
  if (!supabaseConfigured || !/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  const { data } = await supabase.from('grr_threads').select(THREAD_COLUMNS).eq('id', id).maybeSingle()
  if (!data) return null
  const [thread] = await withLikes(supabase, [data as unknown as Omit<Thread, 'liked'>])
  const { data: comments } = await supabase
    .from('grr_comments')
    .select('id, author_id, body, created_at, author:grr_members!grr_comments_author_id_fkey(username, display_name, avatar_url)')
    .eq('thread_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
  return { thread, comments: (comments ?? []) as unknown as Comment[] }
}

export function timeAgo(iso: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'min']]
  for (const [size, label] of units) if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`
  return 'just now'
}
