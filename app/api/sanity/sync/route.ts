import { NextResponse, type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { syncGuide } from '@/lib/content/share'
import { syncHealthProfile } from '@/lib/health-profiles/sync'
import { syncPartner } from '@/lib/partners/sync'

const SYNCERS: Record<string, (id: string) => Promise<unknown>> = {
  partner: syncPartner,
  healthProfile: syncHealthProfile,
  guide: syncGuide,
}

/**
 * Sanity webhook (sanity.io/manage → API → Webhooks), fired on create/update/delete of partners, health profiles and guides.
 * Filter: _type in ["partner", "healthProfile", "guide"]. The signature proves the call comes from Sanity;
 * the document is then re-read from Sanity and pushed to the GRRR Care database (a guide: assistant knowledge + site thread).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'SANITY_WEBHOOK_SECRET is not set' }, { status: 500 })
  const { isValidSignature, body } = await parseBody<{ _id?: string; _type?: string }>(request, secret, true)
  if (!isValidSignature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  const sync = body?._type ? SYNCERS[body._type] : undefined
  if (!body?._id || !sync) return NextResponse.json({ skipped: true })
  try {
    return NextResponse.json(await sync(body._id))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
