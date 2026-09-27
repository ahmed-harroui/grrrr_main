import { NextResponse } from 'next/server'
import { postGuideThread } from '@/lib/content/publish'
import { getPublishedGuideById } from '@/lib/content/store'

export const maxDuration = 300

export async function POST(request: Request) {
  const { id } = (await request.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!process.env.THREADS_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Threads n’est pas encore configuré (THREADS_ACCESS_TOKEN vide). Le fil reste enregistré : tu pourras le publier plus tard.' }, { status: 400 })
  }
  try {
    const guide = await getPublishedGuideById(id)
    if (!guide) return NextResponse.json({ error: 'Publie d’abord le guide dans le Studio.' }, { status: 400 })
    await postGuideThread(guide)
    return NextResponse.json({ posted: guide.thread?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
