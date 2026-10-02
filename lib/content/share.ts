import { ANIMAL_SPECIES, ANIMALS, LIMITS, type Animal } from '../community/limits'
import { createAdminClient } from '../supabase/admin'
import { portableToPlainText } from './portable-text'
import type { FactThreadSchema, Guide } from './schema'
import type { z } from 'zod'

type FactThread = z.infer<typeof FactThreadSchema>
import { getPublishedGuideById, markThreadPosted } from './store'

/** Knowledge entry id from the Sanity id (engine guides are already "guide-<slug>"). */
const guideKnowledgeId = (sanityId: string) => {
  const id = sanityId.replace(/^drafts\./, '')
  return id.startsWith('guide-') ? id : `guide-${id}`
}

/** Words that give away the animal of an older guide saved without one. */
const ANIMAL_WORDS: [Animal, RegExp][] = [
  ['dog', /\b(dogs?|pupp(y|ies))\b/],
  ['cat', /\b(cats?|kittens?)\b/],
  ['rabbit', /\b(rabbits?|bunn(y|ies))\b/],
  ['rodent', /\b(guinea pigs?|hamsters?|rats?|mice|mouse|gerbils?|chinchillas?)\b/],
  ['bird', /\b(birds?|budgies?|parrots?|canar(y|ies)|cockatiels?)\b/],
  ['fish', /\b(fish|aquariums?|goldfish|bettas?)\b/],
  ['reptile', /\b(reptiles?|tortoises?|turtles?|geckos?|bearded dragons?|snakes?|lizards?)\b/],
  ['horse', /\b(horses?|ponies|pony|donkeys?)\b/],
  ['ferret', /\bferrets?\b/],
  ['farm', /\b(hens?|chickens?|ducks?|goats?|sheep|pigs?)\b/],
]

function animalOf(guide: Guide): Animal {
  if (guide.animal && guide.animal in ANIMALS) return guide.animal as Animal
  const text = `${guide.category} ${guide.title} ${guide.question ?? ''}`.toLowerCase()
  const found = ANIMAL_WORDS.filter(([, words]) => words.test(text)).map(([animal]) => animal)
  return found.length === 1 ? found[0] : 'all'
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

/** The site's first admin: official threads are posted under their name. */
async function officialAuthor() {
  const { data: admin, error } = await createAdminClient().from('grr_members').select('id').eq('role', 'admin').order('created_at').limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  if (!admin) throw new Error('Aucun compte admin sur le site : connecte-toi une fois sur /login, puis passe ton compte admin (supabase/threads-knowledge.sql, étape 5).')
  return admin.id as string
}

/** Posts the guide's thread on the site's community feed, as an official Grr thread. Safe to call twice. */
export async function shareGuideThread(guide: Guide) {
  const supabase = createAdminClient()
  const admin = { id: await officialAuthor() }

  const { error } = await supabase.from('grr_threads').upsert(
    { author_id: admin.id, title: guide.title.slice(0, LIMITS.title), body: threadBody(guide), category: 'tip', animal: animalOf(guide), is_official: true, guide_slug: guide.slug },
    { onConflict: 'guide_slug', ignoreDuplicates: true },
  )
  if (error) throw new Error(error.message)
  await markThreadPosted(guide._id)
}

/** Official threads so far per animal family, and the latest titles (to keep new ones different). */
export async function officialThreadsSoFar() {
  const { data, error } = await createAdminClient().from('grr_threads').select('title, animal').eq('is_official', true).order('created_at', { ascending: false }).limit(300)
  if (error) throw new Error(error.message)
  const perAnimal: Record<string, number> = {}
  for (const row of data ?? []) perAnimal[row.animal] = (perAnimal[row.animal] ?? 0) + 1
  return { perAnimal, recentTitles: (data ?? []).slice(0, 40).map((row) => row.title as string) }
}

/** Posts an AI "did you know" thread on the feed (the apps show it too), as an official Grr thread. */
export async function postFactThread(thread: FactThread) {
  const { data, error } = await createAdminClient()
    .from('grr_threads')
    .insert({ author_id: await officialAuthor(), title: thread.title.slice(0, LIMITS.title), body: thread.body.slice(0, LIMITS.body), category: thread.category, animal: thread.animal, is_official: true })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

/** Adds or refreshes the guide in the GRRR Care assistant's knowledge base. */
export async function syncGuideKnowledge(guide: Guide) {
  const animal = animalOf(guide)
  const content = [portableToPlainText(guide.body).replace(/\*\*?/g, ''), guide.vetNote && `When to see a vet: ${guide.vetNote}`].filter(Boolean).join('\n\n')
  const { error } = await createAdminClient().from('knowledge_documents').upsert({
    id: guideKnowledgeId(guide._id),
    title: guide.title,
    category: guide.category.toLowerCase(),
    // The species names the apps give pets (a rodent guide reaches hamsters, guinea pigs…)
    species: ANIMAL_SPECIES[animal],
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
