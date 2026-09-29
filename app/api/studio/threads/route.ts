import { NextResponse } from 'next/server'
import { shareGuideThread, syncGuideKnowledge } from '@/lib/content/share'
import { getPublishedGuideById } from '@/lib/content/store'
import { adminConfigured } from '@/lib/supabase/admin'

/** Studio "Partager sur le site": the guide's thread goes on /threads and the guide into the assistant's knowledge. */
export async function POST(request: Request) {
  const { id } = (await request.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!adminConfigured()) return NextResponse.json({ error: 'SUPABASE_SECRET_KEY manque sur le serveur (Vercel) : impossible de partager pour l’instant.' }, { status: 400 })
  try {
    const guide = await getPublishedGuideById(id)
    if (!guide) return NextResponse.json({ error: 'Publie d’abord le guide dans le Studio.' }, { status: 400 })
    await syncGuideKnowledge(guide)
    await shareGuideThread(guide)
    return NextResponse.json({ shared: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
