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
  /** Set when the thread shares a guide: links to /guides/<slug>. */
  guide_slug: string | null
  /** Upvotes. */
  like_count: number
  comment_count: number
  created_at: string
  author: Author | null
  liked: boolean
}
export type Comment = { id: string; author_id: string; body: string; created_at: string; author: Author | null }

const THREAD_COLUMNS = 'id, author_id, title, body, category, animal, is_official, guide_slug, like_count, comment_count, created_at, author:grr_members!grr_threads_author_id_fkey(username, display_name, avatar_url)'
// Until supabase/threads-knowledge.sql has been run, guide_slug doesn't exist: the feed still shows, without guide links
const LEGACY_COLUMNS = THREAD_COLUMNS.replace('guide_slug, ', '')
const missingGuideSlug = (error: { code?: string; message?: string } | null) => error?.code === '42703' && Boolean(error.message?.includes('guide_slug'))

async function withLikes(supabase: Awaited<ReturnType<typeof createClient>>, rows: Omit<Thread, 'liked'>[]): Promise<Thread[]> {
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId || rows.length === 0) return rows.map((t) => ({ ...t, liked: false }))
  const { data: likes } = await supabase.from('grr_thread_likes').select('thread_id').eq('user_id', userId).in('thread_id', rows.map((t) => t.id))
  const liked = new Set((likes ?? []).map((l) => l.thread_id))
  return rows.map((t) => ({ ...t, liked: liked.has(t.id) }))
}

export type ThreadSort = 'new' | 'trending' | 'top'

const TRENDING_DAYS = 30

/** Hacker News-style: upvotes count for less as a thread gets older, so fresh favourites rise to the top. */
function trendingScore(t: { like_count: number; comment_count: number; created_at: string }) {
  const hours = (Date.now() - new Date(t.created_at).getTime()) / 3_600_000
  return (t.like_count + t.comment_count / 2) / Math.pow(hours + 2, 1.5)
}

export async function listThreads({ sort = 'new', category, limit = 30 }: { sort?: ThreadSort; category?: string; limit?: number } = {}): Promise<Thread[]> {
  if (!supabaseConfigured) return []
  const supabase = await createClient()
  const run = (columns: string) => {
    let query = supabase.from('grr_threads').select(columns).eq('status', 'published')
    if (category && category in THREAD_CATEGORIES) query = query.eq('category', category)
    if (sort === 'trending') query = query.gt('like_count', 0).gte('created_at', new Date(Date.now() - TRENDING_DAYS * 86_400_000).toISOString())
    query = sort === 'new' ? query.order('created_at', { ascending: false }) : query.order('like_count', { ascending: false }).order('created_at', { ascending: false })
    return query.limit(sort === 'trending' ? 200 : limit)
  }
  let { data, error } = await run(THREAD_COLUMNS)
  if (missingGuideSlug(error)) ({ data, error } = await run(LEGACY_COLUMNS))
  if (error) {
    console.error('listThreads:', error.message) // e.g. schema not installed yet — show an empty feed
    return []
  }
  let rows = (data ?? []) as unknown as Omit<Thread, 'liked'>[]
  if (sort === 'trending') rows = rows.sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, limit)
  return withLikes(supabase, rows)
}

export async function getThread(id: string): Promise<{ thread: Thread; comments: Comment[] } | null> {
  if (!supabaseConfigured || !/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createClient()
  let { data, error } = await supabase.from('grr_threads').select(THREAD_COLUMNS).eq('id', id).maybeSingle()
  if (missingGuideSlug(error)) ({ data, error } = await supabase.from('grr_threads').select(LEGACY_COLUMNS).eq('id', id).maybeSingle())
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
