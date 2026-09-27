/**
 * Grr content engine — turns pet-owner questions into guides (stored in Sanity, shown on /guides)
 * and Threads posts that promote them. Everything can also be done by hand in the Studio (/studio).
 *
 *   pnpm content generate "Why does my dog eat grass?"   # one or more questions
 *   pnpm content generate --count 3                      # next 3 questions from the Studio queue
 *   pnpm content generate --publish                      # publish directly instead of saving a draft
 *   pnpm content post [--dry-run] [--wait-live]          # post threads of published guides not yet posted
 *   pnpm content run --count 1 [--publish] [--wait-live] # generate, then post what is published
 *   pnpm content scheduled [--dry-run]                   # the weekly job: follows the Studio dashboard settings
 *   pnpm content ideas                                   # add AI question ideas to the queue
 *   pnpm content import                                  # one-off: move content/guides/*.json + questions.txt into Sanity
 *
 * AUTO_PUBLISH=true has the same effect as --publish.
 */
import './load-env'
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { generateGuides, postPendingThreads, refillQueue, scheduledRun } from '../lib/content/engine'
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

  const generateFromArgs = () => generateGuides({ questions: positional, count, publish })

  switch (command) {
    case 'generate':
      await generateFromArgs()
      break
    case 'post':
      await postPendingThreads({ dryRun, waitLive })
      break
    case 'run':
      await generateFromArgs()
      await postPendingThreads({ dryRun, waitLive })
      break
    case 'scheduled':
      await scheduledRun({ dryRun })
      break
    case 'ideas':
      await refillQueue()
      break
    case 'import':
      await importFiles()
      break
    default:
      console.log('Usage: pnpm content <generate|post|run|scheduled|ideas|import> [questions…] [--count N] [--publish] [--dry-run] [--wait-live]')
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
