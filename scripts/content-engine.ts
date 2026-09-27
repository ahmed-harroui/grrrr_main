/**
 * Grr content engine — turns pet-owner questions into guides (stored in Sanity, shown on /guides)
 * and Threads posts that promote them. Everything can also be done by hand in the Studio (/studio).
 *
 *   pnpm content generate "Why does my dog eat grass?"   # one or more questions
 *   pnpm content generate --count 3                      # next 3 questions from the Studio queue
 *   pnpm content generate --publish                      # publish directly instead of saving a draft
 *   pnpm content post [--dry-run] [--wait-live]          # post threads of published guides not yet posted
 *   pnpm content run --count 1 [--publish] [--wait-live] # generate, then post what is published
 *   pnpm content import                                  # one-off: move content/guides/*.json + questions.txt into Sanity
 *
 * AUTO_PUBLISH=true has the same effect as --publish.
 */
import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { AiDeclinedError, generateGuide } from '../lib/content/ai'
import { key } from '../lib/content/portable-text'
import { postGuideThread } from '../lib/content/publish'
import type { AiBlock } from '../lib/content/schema'
import { addQuestions, existingTitles, guidesPendingThread, markQuestionUsed, nextQuestions, saveGeneratedGuide } from '../lib/content/store'
import { aiBlocksToPortable } from '../lib/content/portable-text'
import { writeClient } from '../lib/sanity/client'

async function generate(questions: { text: string; _id?: string }[], publish: boolean) {
  let created = 0
  for (const question of questions) {
    console.log(`\n✍️  Generating: ${question.text}`)
    try {
      const guide = await generateGuide(question.text, await existingTitles())
      const { id, slug } = await saveGeneratedGuide(guide, question.text, publish)
      if (question._id) await markQuestionUsed(question._id, id)
      created++
      console.log(`   ✓ ${guide.title} → ${publish ? 'published' : 'draft to review in /studio'} (/guides/${slug}, ${guide.thread.length} Threads posts)`)
    } catch (err) {
      if (!(err instanceof AiDeclinedError) && !(err instanceof Error && err.message.startsWith('Incomplete'))) throw err
      console.error(`   ✗ ${err.message} Skipping.`)
    }
  }
  return created
}

async function post(dryRun: boolean, waitLive: boolean) {
  const guides = await guidesPendingThread()
  if (guides.length === 0) return console.log('\nNothing to post — every published guide already has its thread on Threads.')
  for (const guide of guides) {
    console.log(`\n🧵 ${dryRun ? '[dry run] ' : ''}${guide.title}`)
    await postGuideThread(guide, { dryRun, waitLive })
  }
}

/** One-off migration of the file-based content from the first version of the engine. */
async function importFiles() {
  const dir = path.join(process.cwd(), 'content', 'guides')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : []
  type OldGuide = { slug: string; title: string; category: string; excerpt: string; readMinutes: number; question: string; vetNote: string; sections: { heading: string; paragraphs: string[] }[]; thread: { text: string; id?: string }[]; threadPostedAt?: string }
  for (const file of files) {
    const g = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as OldGuide
    const blocks: AiBlock[] = g.sections.flatMap((s) => [{ style: 'h2' as const, text: s.heading }, ...s.paragraphs.map((text) => ({ style: 'normal' as const, text }))])
    await writeClient().createIfNotExists({
      _id: `guide-${g.slug}`,
      _type: 'guide',
      title: g.title,
      slug: { _type: 'slug', current: g.slug },
      category: g.category,
      question: g.question,
      excerpt: g.excerpt,
      readMinutes: g.readMinutes,
      body: aiBlocksToPortable(blocks),
      vetNote: g.vetNote,
      thread: g.thread.map((p) => ({ _key: key(), _type: 'threadPost', text: p.text, ...(p.id ? { postId: p.id } : {}) })),
      ...(g.threadPostedAt ? { threadPostedAt: g.threadPostedAt } : {}),
      source: 'ai',
    })
    console.log(`✓ guide: ${g.title}`)
  }
  const qFile = path.join(process.cwd(), 'content', 'questions.txt')
  const questions = fs.existsSync(qFile) ? fs.readFileSync(qFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : []
  if (questions.length) await addQuestions(questions)
  console.log(`✓ ${questions.length} questions added to the queue`)
  console.log('\nDone. You can now delete content/guides/*.json and content/questions.txt.')
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const waitLive = args.includes('--wait-live')
  const publish = args.includes('--publish') || process.env.AUTO_PUBLISH === 'true'
  const countIdx = args.indexOf('--count')
  const count = countIdx >= 0 ? Number(args[countIdx + 1]) : 1
  const positional = args.filter((a, i) => !a.startsWith('--') && !(countIdx >= 0 && i === countIdx + 1))

  async function generateFromArgs() {
    const questions = positional.length ? positional.map((text) => ({ text })) : await nextQuestions(count)
    if (!questions.length) throw new Error('The question queue is empty — add questions in /studio → « Questions en attente ».')
    return generate(questions, publish)
  }

  switch (command) {
    case 'generate':
      await generateFromArgs()
      break
    case 'post':
      await post(dryRun, waitLive)
      break
    case 'run':
      await generateFromArgs()
      await post(dryRun, waitLive)
      break
    case 'import':
      await importFiles()
      break
    default:
      console.log('Usage: pnpm content <generate|post|run|import> [questions…] [--count N] [--publish] [--dry-run] [--wait-live]')
      process.exitCode = command ? 1 : 0
  }
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) console.error('✗ Anthropic authentication failed — check ANTHROPIC_API_KEY.')
  else if (err instanceof Anthropic.RateLimitError) console.error('✗ Anthropic rate limit hit — try again shortly.')
  else if (err instanceof Anthropic.APIError) console.error(`✗ Anthropic API error ${err.status}: ${err.message}`)
  else console.error(`✗ ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
