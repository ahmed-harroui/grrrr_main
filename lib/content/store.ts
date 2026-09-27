import { readClient, writeClient } from '../sanity/client'
import { sanityConfigured } from '../sanity/env'
import { aiBlocksToPortable, key } from './portable-text'
import type { GeneratedGuide, Guide } from './schema'

const GUIDE_FIELDS = `_id, _createdAt, title, "slug": slug.current, category, question, excerpt, readMinutes, body, vetNote, thread, threadPostedAt`
const PUBLISHED = `!(_id in path("drafts.**"))`

// ---------- website reads (published only) ----------

export async function getAllGuides(): Promise<Guide[]> {
  if (!sanityConfigured) return []
  return readClient.fetch(`*[_type == "guide" && defined(slug.current)] | order(_createdAt desc) { ${GUIDE_FIELDS} }`)
}

export async function getGuide(slug: string): Promise<Guide | null> {
  if (!sanityConfigured) return null
  return readClient.fetch(`*[_type == "guide" && slug.current == $slug][0] { ${GUIDE_FIELDS} }`, { slug })
}

// ---------- script / API writes ----------

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 60).replace(/-+$/, '')
}

async function uniqueSlug(base: string) {
  const client = writeClient()
  let slug = base
  for (let i = 2; await client.fetch(`count(*[_type == "guide" && slug.current == $slug])`, { slug }); i++) slug = `${base}-${i}`
  return slug
}

export async function existingTitles(): Promise<string[]> {
  return writeClient().fetch(`*[_type == "guide" && ${PUBLISHED}].title`)
}

/** Saves an AI-generated guide — as a draft to review in the Studio, or published directly. */
export async function saveGeneratedGuide(generated: GeneratedGuide, question: string, publish: boolean) {
  const slug = await uniqueSlug(slugify(generated.title))
  const id = `guide-${slug}`
  await writeClient().create({
    _id: publish ? id : `drafts.${id}`,
    _type: 'guide',
    title: generated.title,
    slug: { _type: 'slug', current: slug },
    category: generated.category,
    question,
    excerpt: generated.excerpt,
    readMinutes: generated.readMinutes,
    body: aiBlocksToPortable(generated.body),
    vetNote: generated.vetNote,
    thread: generated.thread.map((text) => ({ _key: key(), _type: 'threadPost', text })),
    source: 'ai',
  })
  return { id, slug }
}

export async function nextQuestions(count: number): Promise<{ _id: string; text: string }[]> {
  return writeClient().fetch(`*[_type == "question" && ${PUBLISHED} && used != true] | order(_createdAt asc)[0...$count] { _id, text }`, { count })
}

export async function markQuestionUsed(questionId: string, guideId: string) {
  await writeClient().patch(questionId).set({ used: true, guide: { _type: 'reference', _ref: guideId, _weak: true } }).commit()
}

export async function addQuestions(texts: string[]) {
  const tx = writeClient().transaction()
  for (const text of texts) tx.create({ _type: 'question', text, used: false })
  await tx.commit()
}

export async function getPublishedGuideById(id: string): Promise<Guide | null> {
  return writeClient().fetch(`*[_id == $id][0] { ${GUIDE_FIELDS} }`, { id: id.replace(/^drafts\./, '') })
}

export async function guidesPendingThread(): Promise<Guide[]> {
  return writeClient().fetch(`*[_type == "guide" && ${PUBLISHED} && count(thread) > 0 && !defined(threadPostedAt)] | order(_createdAt asc) { ${GUIDE_FIELDS} }`)
}

/** Writes to the published doc AND any open draft, so publishing a later edit can't wipe the posted ids. */
async function patchBoth(id: string, set: Record<string, unknown>) {
  const client = writeClient()
  const draftId = `drafts.${id}`
  const tx = client.transaction().patch(id, (p) => p.set(set))
  if (await client.fetch(`defined(*[_id == $draftId][0]._id)`, { draftId })) tx.patch(draftId, (p) => p.set(set))
  await tx.commit()
}

export function savePostId(guideId: string, postKey: string, postId: string) {
  return patchBoth(guideId, { [`thread[_key=="${postKey}"].postId`]: postId })
}

export function markThreadPosted(guideId: string) {
  return patchBoth(guideId, { threadPostedAt: new Date().toISOString() })
}
