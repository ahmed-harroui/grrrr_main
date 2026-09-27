import { markThreadPosted, savePostId } from './store'
import { postText, publishPost, waitUntilLive } from './threads'
import type { Guide } from './schema'

type Options = { dryRun?: boolean; waitLive?: boolean; log?: (line: string) => void }

/** Posts a guide's thread to Threads as a reply chain. Resumable: posts that already have an id are skipped. */
export async function postGuideThread(guide: Guide, { dryRun = false, waitLive = false, log = console.log }: Options = {}) {
  const thread = guide.thread ?? []
  if (!thread.length) throw new Error(`"${guide.title}" has no Threads posts.`)
  if (guide.threadPostedAt) throw new Error(`"${guide.title}" was already posted on ${guide.threadPostedAt}.`)
  if (!dryRun && !process.env.SITE_URL) log('   ! SITE_URL not set — the last post will have no guide link.')
  if (!dryRun && waitLive) {
    log('   ⏳ waiting for the guide page to be live')
    await waitUntilLive(guide.slug)
  }

  let replyTo: string | undefined
  for (const [i, post] of thread.entries()) {
    const text = postText(post.text, i === thread.length - 1, guide.slug)
    if (post.postId) { replyTo = post.postId; continue }
    if (dryRun) {
      log(`   ${i + 1}/${thread.length} (${text.length} chars)\n   ${text.replace(/\n/g, '\n   ')}\n`)
      continue
    }
    const id = await publishPost(text, replyTo)
    await savePostId(guide._id, post._key, id)
    replyTo = id
    log(`   ✓ posted ${i + 1}/${thread.length} (${id})`)
  }
  if (!dryRun) await markThreadPosted(guide._id)
}
