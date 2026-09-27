import { NextResponse } from 'next/server'
import { AiDeclinedError, critiqueGuide, generateGuide, generateThread, rewriteGuide } from '@/lib/content/ai'
import type { RewriteMode } from '@/lib/content/modes'
import { aiBlocksToPortable, key, portableToAiBlocks } from '@/lib/content/portable-text'
import type { PortableBlock } from '@/lib/content/schema'
import { existingTitles } from '@/lib/content/store'

export const maxDuration = 300

type Body = {
  task: 'draft' | 'rewrite' | 'critique' | 'thread'
  mode?: RewriteMode
  instruction?: string
  doc?: { question?: string; title?: string; excerpt?: string; body?: PortableBlock[]; vetNote?: string } | null
}

export async function POST(request: Request) {
  const { task, mode, instruction, doc } = (await request.json()) as Body
  const draft = { title: doc?.title ?? '', excerpt: doc?.excerpt ?? '', body: portableToAiBlocks(doc?.body), vetNote: doc?.vetNote }

  try {
    switch (task) {
      case 'draft': {
        if (!doc?.question) return NextResponse.json({ error: 'Remplis d’abord la question de départ.' }, { status: 400 })
        const titles = await existingTitles().catch(() => [])
        const g = await generateGuide(doc.question, titles.filter((t) => t !== doc.title))
        return NextResponse.json({
          patch: {
            title: g.title,
            excerpt: g.excerpt,
            category: g.category,
            readMinutes: g.readMinutes,
            vetNote: g.vetNote,
            body: aiBlocksToPortable(g.body),
            thread: g.thread.map((text) => ({ _key: key(), _type: 'threadPost', text })),
          },
        })
      }
      case 'rewrite': {
        const r = await rewriteGuide(draft, mode ?? 'brand', instruction)
        return NextResponse.json({ patch: { title: r.title, excerpt: r.excerpt, body: aiBlocksToPortable(r.body) } })
      }
      case 'critique':
        return NextResponse.json({ critique: await critiqueGuide(draft) })
      case 'thread': {
        const thread = await generateThread(draft)
        return NextResponse.json({ patch: { thread: thread.map((text) => ({ _key: key(), _type: 'threadPost', text })) } })
      }
      default:
        return NextResponse.json({ error: 'Unknown task' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof AiDeclinedError ? 'Claude a refusé cette demande. Reformule la question ou le texte.' : err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
