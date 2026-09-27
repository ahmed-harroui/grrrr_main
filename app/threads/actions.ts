'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AiDeclinedError, generateFactThread } from '@/lib/content/ai'
import { ANIMALS, LIMITS, THREAD_CATEGORIES } from '@/lib/community/threads'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'

export type FormState = { error?: string } | undefined

async function requireUser(next = '/threads') {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) redirect(`/login?next=${encodeURIComponent(next)}`)
  return { supabase, userId }
}

/** Postgres raises our own messages (rate limit) — show those, hide the rest. */
function friendly(message: string) {
  if (message.includes('Daily limit')) return message.replace(/^.*?(Daily limit)/, '$1')
  if (message.includes('check constraint')) return 'Please check the length of your text.'
  return 'Something went wrong. Please try again.'
}

export async function createThread(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser('/threads/new')
  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const category = String(formData.get('category') ?? 'fact')
  const animal = String(formData.get('animal') ?? 'all')
  const official = formData.get('official') === 'on'

  if (title.length < 3 || title.length > LIMITS.title) return { error: `The title must be 3–${LIMITS.title} characters.` }
  if (body.length < 10 || body.length > LIMITS.body) return { error: `The text must be 10–${LIMITS.body} characters.` }
  if (!(category in THREAD_CATEGORIES) || !(animal in ANIMALS)) return { error: 'Please pick a category.' }

  // is_official is silently reset by the database for non-admins.
  const { data, error } = await supabase
    .from('grr_threads')
    .insert({ author_id: userId, title, body, category, animal, is_official: official })
    .select('id')
    .single()
  if (error) return { error: friendly(error.message) }

  revalidatePath('/threads')
  revalidatePath('/')
  redirect(`/threads/${data.id}`)
}

export async function toggleLike(threadId: string, like: boolean) {
  const { supabase, userId } = await requireUser(`/threads/${threadId}`)
  const { error } = like
    ? await supabase.from('grr_thread_likes').insert({ thread_id: threadId, user_id: userId })
    : await supabase.from('grr_thread_likes').delete().eq('thread_id', threadId).eq('user_id', userId)
  // A duplicate like (double click) is fine: the state is already what the visitor wants.
  if (error && error.code !== '23505') throw new Error(friendly(error.message))
  revalidatePath('/threads')
  revalidatePath(`/threads/${threadId}`)
}

export async function addComment(threadId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser(`/threads/${threadId}`)
  const body = String(formData.get('body') ?? '').trim()
  if (!body || body.length > LIMITS.comment) return { error: `Comments must be 1–${LIMITS.comment} characters.` }
  const { error } = await supabase.from('grr_comments').insert({ thread_id: threadId, author_id: userId, body })
  if (error) return { error: friendly(error.message) }
  revalidatePath(`/threads/${threadId}`)
  return {}
}

export async function deleteThread(threadId: string) {
  const { supabase } = await requireUser()
  await supabase.from('grr_threads').delete().eq('id', threadId) // RLS: own thread or admin
  revalidatePath('/threads')
  revalidatePath('/')
  redirect('/threads')
}

export async function deleteComment(threadId: string, commentId: string) {
  const { supabase } = await requireUser()
  await supabase.from('grr_comments').delete().eq('id', commentId)
  revalidatePath(`/threads/${threadId}`)
}

export async function reportThread(threadId: string, reason: string) {
  const { supabase, userId } = await requireUser(`/threads/${threadId}`)
  const text = reason.trim().slice(0, 300)
  if (text.length < 3) return { error: 'Tell us briefly what is wrong.' }
  const { error } = await supabase.from('grr_reports').insert({ thread_id: threadId, reporter_id: userId, reason: text })
  if (error && error.code !== '23505') return { error: friendly(error.message) }
  return { ok: true }
}

/** Admins only: Claude drafts an official fact thread to review before posting. */
export async function suggestFactThread(topic: string) {
  const profile = await getCurrentProfile()
  if (profile?.role !== 'admin') return { error: 'Only admins can use AI suggestions.' }
  try {
    const supabase = await createClient()
    const { data: recent } = await supabase.from('grr_threads').select('title').eq('is_official', true).order('created_at', { ascending: false }).limit(30)
    const thread = await generateFactThread(topic, (recent ?? []).map((r) => r.title))
    return { thread }
  } catch (err) {
    return { error: err instanceof AiDeclinedError ? 'The AI declined this topic — try another one.' : err instanceof Error ? err.message : String(err) }
  }
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser('/account')
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const displayName = String(formData.get('display_name') ?? '').trim().slice(0, 40)
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { error: 'Username: 3–24 characters, letters, numbers or _ only.' }
  const { error } = await supabase.from('grr_members').update({ username, display_name: displayName || null }).eq('id', userId)
  if (error) return { error: error.code === '23505' ? 'This username is already taken.' : friendly(error.message) }
  revalidatePath('/', 'layout')
  return {}
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
