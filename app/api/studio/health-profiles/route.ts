import { NextResponse } from 'next/server'
import { importHealthProfilesFromSupabase, syncAllHealthProfiles, syncHealthProfile } from '@/lib/health-profiles/sync'

export const maxDuration = 120

/** Studio helpers (behind the Studio password): push one profile / all profiles to the app, or import the app's defaults. */
export async function POST(request: Request) {
  const { action, id } = (await request.json()) as { action?: 'sync' | 'syncAll' | 'import'; id?: string }
  try {
    switch (action) {
      case 'sync':
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        return NextResponse.json(await syncHealthProfile(id))
      case 'syncAll':
        return NextResponse.json(await syncAllHealthProfiles())
      case 'import':
        return NextResponse.json(await importHealthProfilesFromSupabase())
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
