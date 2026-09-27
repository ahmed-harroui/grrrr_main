import { AiDeclinedError, generateGuide, suggestQuestions } from './ai'
import { postGuideThread } from './publish'
import { addQuestions, coveredTopics, existingTitles, getEngineSettings, guidesPendingThread, markQuestionUsed, nextQuestions, saveGeneratedGuide } from './store'

/** How many new question ideas Claude adds when the queue runs empty (≈ 2 months at one guide a week). */
export const QUEUE_REFILL = 8

type Log = (line: string) => void

export async function refillQueue(log: Log = console.log) {
  const ideas = await suggestQuestions(QUEUE_REFILL, await coveredTopics())
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
      if (question._id) await markQuestionUsed(question._id, id)
      created.push({ title: guide.title, id, slug, published: publish })
      log(`   ✓ ${guide.title} → ${publish ? 'published' : 'draft to review in /studio'} (/guides/${slug})`)
    } catch (err) {
      if (!(err instanceof AiDeclinedError) && !(err instanceof Error && err.message.startsWith('Incomplete'))) throw err
      log(`   ✗ ${err.message} Skipping.`)
    }
  }
  return created
}

/** Posts the thread of every published guide not yet on Threads. No-op when Threads isn't configured. */
export async function postPendingThreads({ dryRun = false, waitLive = false, log = console.log }: { dryRun?: boolean; waitLive?: boolean; log?: Log } = {}) {
  if (!dryRun && !process.env.THREADS_ACCESS_TOKEN) {
    log('Threads not configured (THREADS_ACCESS_TOKEN is empty) — skipping posting. Threads are kept in Sanity for later.')
    return 0
  }
  const guides = await guidesPendingThread()
  if (guides.length === 0) log('Nothing to post — every published guide already has its thread on Threads.')
  for (const guide of guides) {
    log(`🧵 ${dryRun ? '[dry run] ' : ''}${guide.title}`)
    await postGuideThread(guide, { dryRun, waitLive, log })
  }
  return guides.length
}

/** The scheduled run: obeys the settings chosen in the Studio dashboard. */
export async function scheduledRun({ dryRun = false, log = console.log }: { dryRun?: boolean; log?: Log } = {}) {
  const settings = await getEngineSettings()
  if (settings.paused) {
    log('⏸  Automatic mode is paused in the Studio dashboard — no new guide this time.')
  } else {
    await generateGuides({ count: settings.guidesPerRun, publish: settings.autoPublish, log })
  }
  await postPendingThreads({ dryRun, waitLive: true, log })
}
