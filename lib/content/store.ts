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

/** The questions most asked in the GRRR Care app come first; then the oldest. */
export async function nextQuestions(count: number): Promise<{ _id: string; text: string }[]> {
  return writeClient().fetch(`*[_type == "question" && ${PUBLISHED}] | order(coalesce(asks, 1) desc, _createdAt asc)[0...$count] { _id, text }`, { count })
}

export const ENGINE_SETTINGS_ID = 'engineSettings'
export type EngineSettings = { paused: boolean; autoPublish: boolean; guidesPerRun: number }

/** Settings chosen in the Studio dashboard; falls back to AUTO_PUBLISH until they've been saved once. */
export async function getEngineSettings(): Promise<EngineSettings> {
  const doc = await writeClient().fetch<Partial<EngineSettings> | null>(`*[_id == $id][0]`, { id: ENGINE_SETTINGS_ID })
  return {
    paused: doc?.paused ?? false,
    autoPublish: doc?.autoPublish ?? process.env.AUTO_PUBLISH === 'true',
    guidesPerRun: Math.min(Math.max(doc?.guidesPerRun ?? 1, 1), 5),
  }
}

/** Every queued question, and the title and question of every guide (drafts too) — used to keep new question ideas fresh. */
export async function coveredTopics(): Promise<string[]> {
  const { questions, guides } = await writeClient().fetch<{ questions: string[]; guides: { title?: string; question?: string }[] }>(
    `{ "questions": *[_type == "question" && ${PUBLISHED}].text, "guides": *[_type == "guide"] { title, question } }`,
  )
  return [...new Set([...questions, ...guides.flatMap((g) => [g.title, g.question])].filter((t): t is string => Boolean(t)))]
}

/** A question leaves the queue once its guide is written: the guide keeps the question it came from. */
export async function removeQuestion(questionId: string) {
  await writeClient().delete(questionId)
}

export async function addQuestions(texts: string[]) {
  const tx = writeClient().transaction()
  for (const text of texts) tx.create({ _type: 'question', text })
  await tx.commit()
}

export async function getPublishedGuideById(id: string): Promise<Guide | null> {
  return writeClient().fetch(`*[_id == $id][0] { ${GUIDE_FIELDS} }`, { id: id.replace(/^drafts\./, '') })
}

export async function guidesPendingThread(): Promise<Guide[]> {
  return writeClient().fetch(`*[_type == "guide" && ${PUBLISHED} && count(thread) > 0 && !defined(threadPostedAt)] | order(_createdAt asc) { ${GUIDE_FIELDS} }`)
}

export async function publishedGuides(): Promise<Guide[]> {
  return writeClient().fetch(`*[_type == "guide" && ${PUBLISHED}] | order(_createdAt asc) { ${GUIDE_FIELDS} }`)
}

/** Writes to the published doc AND any open draft, so publishing a later edit can't wipe the "shared" date. */
async function patchBoth(id: string, set: Record<string, unknown>) {
  const client = writeClient()
  const draftId = `drafts.${id}`
  const tx = client.transaction().patch(id, (p) => p.set(set))
  if (await client.fetch(`defined(*[_id == $draftId][0]._id)`, { draftId })) tx.patch(draftId, (p) => p.set(set))
  await tx.commit()
}

export function markThreadPosted(guideId: string) {
  return patchBoth(guideId, { threadPostedAt: new Date().toISOString() })
}
