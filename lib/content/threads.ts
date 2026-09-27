const THREADS_API = 'https://graph.threads.net/v1.0'
export const THREADS_MAX_CHARS = 500

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function threadsRequest(endpoint: string, params: Record<string, string>) {
  const token = process.env.THREADS_ACCESS_TOKEN
  if (!token) throw new Error('Missing THREADS_ACCESS_TOKEN (set it in .env.local).')
  const res = await fetch(`${THREADS_API}/${endpoint}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: token }) })
  const body = (await res.json()) as { id?: string; error?: { message: string } }
  if (!res.ok || !body.id) throw new Error(`Threads ${endpoint} failed (${res.status}): ${body.error?.message ?? JSON.stringify(body)}`)
  return body.id
}

/** Creates a text container, then publishes it. Returns the published post id. */
export async function publishPost(text: string, replyToId?: string) {
  const userId = process.env.THREADS_USER_ID || 'me'
  const creationId = await threadsRequest(`${userId}/threads`, { media_type: 'TEXT', text, ...(replyToId ? { reply_to_id: replyToId } : {}) })
  // Meta recommends a short pause so the container finishes processing before publishing.
  for (let attempt = 1; ; attempt++) {
    await sleep(attempt === 1 ? 3000 : 10000)
    try {
      return await threadsRequest(`${userId}/threads_publish`, { creation_id: creationId })
    } catch (err) {
      if (attempt >= 4) throw err
    }
  }
}

export function guideUrl(slug: string) {
  const site = process.env.SITE_URL?.replace(/\/$/, '')
  return site ? `${site}/guides/${slug}` : null
}

/** Appends the guide link to the last post, trimming the text so the post stays under the Threads limit. */
export function postText(text: string, isLast: boolean, slug: string) {
  const link = isLast ? guideUrl(slug) : null
  if (!link) return text.slice(0, THREADS_MAX_CHARS)
  const room = THREADS_MAX_CHARS - link.length - 2
  return `${text.length > room ? text.slice(0, room - 1).trimEnd() + '…' : text}\n\n${link}`
}

/** Polls the guide URL until it returns 200, so the thread never links to a page that isn't live yet. */
export async function waitUntilLive(slug: string, timeoutMs = 20 * 60_000) {
  const url = guideUrl(slug)
  if (!url) throw new Error('Missing SITE_URL.')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
    if (res?.ok) return
    await sleep(20_000)
  }
  throw new Error(`${url} still not live after ${timeoutMs / 60_000} min — not posting.`)
}
