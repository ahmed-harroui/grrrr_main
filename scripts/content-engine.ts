/**
 * Grr content engine — turns pet-owner questions into guides (stored in Sanity, shown on /guides)
 * shared as threads on the site's community feed (/threads) and added to the GRRR Care assistant's knowledge.
 * Everything can also be done by hand in the Studio (/studio).
 *
 *   pnpm content generate "Why does my dog eat grass?"   # one or more questions
 *   pnpm content generate --count 3                      # next 3 questions from the Studio queue
 *   pnpm content generate --publish                      # publish directly instead of saving a draft
 *   pnpm content share                                   # share published guides not yet shared
 *   pnpm content knowledge                               # resend every published guide to the assistant
 *   pnpm content run --count 1 [--publish]               # generate, then share what is published
 *   pnpm content scheduled                               # the weekly job: follows the Studio dashboard settings
 *   pnpm content ideas                                   # add AI question ideas to the queue (least covered animals first)
 *   pnpm content threads --count 3                       # post AI "did you know" threads on the least covered animals
 *   pnpm content import                                  # one-off: move content/guides/*.json + questions.txt into Sanity
 *
 * AUTO_PUBLISH=true has the same effect as --publish.
 */
import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { generateGuides, postFactThreads, refillQueue, scheduledRun, sharePendingGuides, syncAllKnowledge } from '../lib/content/engine'
import { aiBlocksToPortable, key } from '../lib/content/portable-text'
import type { AiBlock } from '../lib/content/schema'
import { addQuestions } from '../lib/content/store'
import { writeClient } from '../lib/sanity/client'

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
      thread: g.thread.map((p) => ({ _key: key(), _type: 'threadPost', text: p.text })),
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
  const publish = args.includes('--publish') || process.env.AUTO_PUBLISH === 'true'
  const countIdx = args.indexOf('--count')
  const count = countIdx >= 0 ? Number(args[countIdx + 1]) : 1
  const positional = args.filter((a, i) => !a.startsWith('--') && !(countIdx >= 0 && i === countIdx + 1))

  const generateFromArgs = () => generateGuides({ questions: positional, count, publish })

  switch (command) {
    case 'generate':
      await generateFromArgs()
      break
    case 'share':
      await sharePendingGuides()
      break
    case 'knowledge':
      await syncAllKnowledge()
      break
    case 'run':
      await generateFromArgs()
      await sharePendingGuides()
      break
    case 'scheduled':
      await scheduledRun()
      break
    case 'ideas':
      await refillQueue()
      break
    case 'threads':
      await postFactThreads({ count })
      break
    case 'import':
      await importFiles()
      break
    default:
      console.log('Usage: pnpm content <generate|share|knowledge|run|scheduled|ideas|threads|import> [questions…] [--count N] [--publish]')
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
