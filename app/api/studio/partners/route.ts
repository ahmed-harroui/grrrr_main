import { NextResponse } from 'next/server'
import { geocode } from '@/lib/partners/geocode'
import { syncAllPartners, syncPartner } from '@/lib/partners/sync'

export const maxDuration = 300

/** Studio helpers (behind the Studio password): geocode an address, sync one partner, or resync them all. */
export async function POST(request: Request) {
  const { action, address, id } = (await request.json()) as { action?: 'geocode' | 'sync' | 'syncAll'; address?: string; id?: string }
  try {
    switch (action) {
      case 'geocode': {
        if (!address?.trim()) return NextResponse.json({ error: 'Remplis d’abord l’adresse.' }, { status: 400 })
        const hit = await geocode(address)
        return hit ? NextResponse.json(hit) : NextResponse.json({ error: 'Adresse introuvable. Ajoute le code postal et la ville.' }, { status: 404 })
      }
      case 'sync':
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        return NextResponse.json(await syncPartner(id))
      case 'syncAll':
        return NextResponse.json(await syncAllPartners())
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
