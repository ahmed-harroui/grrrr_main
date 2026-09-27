import { NextResponse } from 'next/server'
import { generateGuides, postPendingThreads, refillQueue } from '@/lib/content/engine'
import { getEngineSettings } from '@/lib/content/store'

export const maxDuration = 300

/** What the dashboard can't read from Sanity itself: which integrations are configured. */
export function GET() {
  return NextResponse.json({ threadsConfigured: Boolean(process.env.THREADS_ACCESS_TOKEN), aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY) })
}

export async function POST(request: Request) {
  const { action } = (await request.json()) as { action?: 'generate' | 'ideas' | 'post' }
  const lines: string[] = []
  const log = (line: string) => lines.push(line)
  try {
    switch (action) {
      case 'generate': {
        const { autoPublish } = await getEngineSettings()
        const created = await generateGuides({ count: 1, publish: autoPublish, log })
        return NextResponse.json({ ok: created.length > 0, log: lines, created })
      }
      case 'ideas':
        await refillQueue(log)
        return NextResponse.json({ ok: true, log: lines })
      case 'post': {
        const posted = await postPendingThreads({ log })
        return NextResponse.json({ ok: true, log: lines, posted })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), log: lines }, { status: 500 })
  }
}
