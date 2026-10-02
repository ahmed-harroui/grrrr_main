import { AiDeclinedError, generateFactThread, generateGuide, suggestQuestions } from './ai'
import { ANIMAL_KEYS, ANIMALS, type Animal } from '../community/limits'
import { adminConfigured } from '../supabase/admin'
import { officialThreadsSoFar, postFactThread, shareGuideThread, syncGuideKnowledge } from './share'
import { addQuestions, coveredTopics, existingTitles, getEngineSettings, guidesPendingThread, guidesPerAnimal, nextQuestions, publishedGuides, removeQuestion, saveGeneratedGuide } from './store'

/** How many new question ideas Claude adds when the queue runs empty (≈ 2 months at one guide a week). */
export const QUEUE_REFILL = 8

type Log = (line: string) => void

/** The animal families with the fewest items first (ties in a random order), `count` of them. */
function leastCovered(counts: Record<string, number>, count: number): Animal[] {
  const families = ANIMAL_KEYS.filter((a) => a !== 'all')
    .map((animal) => ({ animal, n: counts[animal] ?? 0, tie: Math.random() }))
    .sort((a, b) => a.n - b.n || a.tie - b.tie)
    .map((item) => item.animal)
  return Array.from({ length: count }, (_, i) => families[i % families.length])
}

export async function refillQueue(log: Log = console.log) {
  const ideas = await suggestQuestions(QUEUE_REFILL, await coveredTopics(), leastCovered(await guidesPerAnimal(), QUEUE_REFILL))
  await addQuestions(ideas)
  log(`💡 Added ${ideas.length} question ideas:\n${ideas.map((q) => `   • ${q}`).join('\n')}`)
  return ideas
}

/** Writes guides for the given questions (or the next ones in the queue, refilling it if needed). */
export async function generateGuides({ questions, count, publish, log = console.log }: { questions?: string[]; count: number; publish: boolean; log?: Log }) {
  let queue: { text: string; _id?: string }[] = questions?.length ? questions.map((text) => ({ text })) : await nextQuestions(count)
  if (!questions?.length && queue.length < count) {
    await refillQueue(log)
    queue = await nextQuestions(count)
  }

  const created: { title: string; id: string; slug: string; published: boolean }[] = []
  for (const question of queue) {
    log(`✍️  Generating: ${question.text}`)
    try {
      const guide = await generateGuide(question.text, await existingTitles())
      const { id, slug } = await saveGeneratedGuide(guide, question.text, publish)
      if (question._id) await removeQuestion(question._id)
      created.push({ title: guide.title, id, slug, published: publish })
      log(`   ✓ ${guide.title} → ${publish ? 'published' : 'draft to review in /studio'} (/guides/${slug})`)
    } catch (err) {
      if (!(err instanceof AiDeclinedError) && !(err instanceof Error && err.message.startsWith('Incomplete'))) throw err
      log(`   ✗ ${err.message} Skipping.`)
    }
  }
  return created
}

const NOT_CONFIGURED = 'Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY) — guides are not shared yet; they will be on the next run.'

/** Every published guide not yet shared: its thread goes on the site's feed and the guide into the assistant's knowledge. */
export async function sharePendingGuides({ log = console.log }: { log?: Log } = {}) {
  if (!adminConfigured()) {
    log(NOT_CONFIGURED)
    return 0
  }
  const guides = await guidesPendingThread()
  if (guides.length === 0) log('Nothing to share — every published guide already has its thread on the site.')
  for (const guide of guides) {
    await syncGuideKnowledge(guide)
    await shareGuideThread(guide)
    log(`🧵 ${guide.title} → thread on /threads + assistant knowledge`)
  }
  return guides.length
}

/** Sends every published guide to the assistant's knowledge again (after edits, or to fill it the first time). */
export async function syncAllKnowledge({ log = console.log }: { log?: Log } = {}) {
  if (!adminConfigured()) throw new Error(NOT_CONFIGURED)
  const guides = await publishedGuides()
  for (const guide of guides) await syncGuideKnowledge(guide)
  log(`🧠 ${guides.length} guide(s) in the GRRR Care assistant's knowledge.`)
  return guides.length
}

/** "Did you know" threads posted straight on the feed, one per animal family with the fewest threads. */
export async function postFactThreads({ count, log = console.log }: { count: number; log?: Log }) {
  if (!adminConfigured()) {
    log(NOT_CONFIGURED)
    return 0
  }
  const { perAnimal, recentTitles } = await officialThreadsSoFar()
  let posted = 0
  for (const animal of leastCovered(perAnimal, count)) {
    try {
      const thread = await generateFactThread('', recentTitles, animal)
      await postFactThread(thread)
      recentTitles.unshift(thread.title)
      posted++
      log(`🧵 ${ANIMALS[thread.animal]} · ${thread.title}`)
    } catch (err) {
      if (!(err instanceof AiDeclinedError) && !(err instanceof Error && err.message.startsWith('Incomplete'))) throw err
      log(`   ✗ ${err.message} Skipping.`)
    }
  }
  return posted
}

/** The scheduled run: obeys the settings chosen in the Studio dashboard. */
export async function scheduledRun({ log = console.log }: { log?: Log } = {}) {
  const settings = await getEngineSettings()
  if (settings.paused) {
    log('⏸  Automatic mode is paused in the Studio dashboard — no new guide or thread this time.')
  } else {
    await generateGuides({ count: settings.guidesPerRun, publish: settings.autoPublish, log })
    if (settings.threadsPerRun > 0) await postFactThreads({ count: settings.threadsPerRun, log })
  }
  await sharePendingGuides({ log })
}
