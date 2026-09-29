import { LIMITS, type Animal } from '../community/limits'
import { createAdminClient } from '../supabase/admin'
import { portableToPlainText } from './portable-text'
import type { Guide } from './schema'
import { getPublishedGuideById, markThreadPosted } from './store'

/** Knowledge entry id from the Sanity id (engine guides are already "guide-<slug>"). */
const guideKnowledgeId = (sanityId: string) => {
  const id = sanityId.replace(/^drafts\./, '')
  return id.startsWith('guide-') ? id : `guide-${id}`
}

function animalOf(guide: Guide): Animal {
  const text = `${guide.category} ${guide.title} ${guide.question ?? ''}`.toLowerCase()
  const cat = /\b(cats?|kittens?)\b/.test(text)
  const dog = /\b(dogs?|pupp(y|ies))\b/.test(text)
  return cat === dog ? 'all' : cat ? 'cat' : 'dog'
}

/** The guide's posts become one thread: a paragraph per post, cut at a paragraph so it fits the thread limit. */
function threadBody(guide: Guide) {
  let body = ''
  for (const post of guide.thread ?? []) {
    const next = body ? `${body}\n\n${post.text.trim()}` : post.text.trim()
    if (next.length > LIMITS.body) break
    body = next
  }
  return body || guide.excerpt.slice(0, LIMITS.body)
}

/** Posts the guide's thread on the site's community feed, as an official Grr thread. Safe to call twice. */
export async function shareGuideThread(guide: Guide) {
  const supabase = createAdminClient()
  const { data: admin, error: adminError } = await supabase.from('grr_members').select('id').eq('role', 'admin').order('created_at').limit(1).maybeSingle()
  if (adminError) throw new Error(adminError.message)
  if (!admin) throw new Error('Aucun compte admin sur le site : connecte-toi une fois sur /login, puis passe ton compte admin (supabase/threads-knowledge.sql, étape 5).')

  const { error } = await supabase.from('grr_threads').upsert(
    { author_id: admin.id, title: guide.title.slice(0, LIMITS.title), body: threadBody(guide), category: 'tip', animal: animalOf(guide), is_official: true, guide_slug: guide.slug },
    { onConflict: 'guide_slug', ignoreDuplicates: true },
  )
  if (error) throw new Error(error.message)
  await markThreadPosted(guide._id)
}

/** Adds or refreshes the guide in the GRRR Care assistant's knowledge base. */
export async function syncGuideKnowledge(guide: Guide) {
  const animal = animalOf(guide)
  const content = [portableToPlainText(guide.body).replace(/\*\*?/g, ''), guide.vetNote && `When to see a vet: ${guide.vetNote}`].filter(Boolean).join('\n\n')
  const { error } = await createAdminClient().from('knowledge_documents').upsert({
    id: guideKnowledgeId(guide._id),
    title: guide.title,
    category: guide.category.toLowerCase(),
    species: animal === 'all' ? [] : [animal],
    // The excerpt opens the content: the assistant's catalogue shows the first lines of each entry
    content: `${guide.excerpt}\n\n${content}`,
    is_published: true,
  })
  if (error) throw new Error(error.message)
}

export async function removeGuideKnowledge(sanityId: string) {
  const { error } = await createAdminClient().from('knowledge_documents').delete().eq('id', guideKnowledgeId(sanityId))
  if (error) throw new Error(error.message)
}

/** Webhook: a guide was published, edited, unpublished or deleted in the Studio. */
export async function syncGuide(sanityId: string) {
  const id = sanityId.replace(/^drafts\./, '')
  const guide = await getPublishedGuideById(id)
  if (!guide) {
    await removeGuideKnowledge(id)
    return { id, action: 'removed' as const }
  }
  await syncGuideKnowledge(guide)
  if (!guide.threadPostedAt && guide.thread?.length) await shareGuideThread(guide)
  return { id, action: 'synced' as const }
}
