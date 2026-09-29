import { writeClient } from '../sanity/client'
import { createAdminClient } from '../supabase/admin'
import { DAYS, type Day } from './constants'
import { geocode } from './geocode'

type SanityPartner = {
  _id: string
  name: string
  category: string
  description?: string
  address?: string
  location?: { lat?: number; lng?: number }
  phone?: string
  email?: string
  website?: string
  hours?: Partial<Record<Day, string>>
  services?: string[]
  rating?: number
  isFeatured?: boolean
  logoUrl?: string
  coverUrl?: string
}

const PARTNER_QUERY = `{
  _id, name, category, description, address, location, phone, email, website, hours, services, rating, isFeatured,
  "logoUrl": logo.asset->url, "coverUrl": coverImage.asset->url
}`

/** Maps a published Sanity partner to a row of the Grr Care `partners` table. */
async function toRow(p: SanityPartner) {
  let { lat, lng } = p.location ?? {}
  if ((lat == null || lng == null) && p.address) {
    const hit = await geocode(p.address).catch(() => null) // forgot to click "Localiser": do it now
    if (hit) ({ lat, lng } = hit)
  }
  const hours = p.hours ? Object.fromEntries(DAYS.filter(({ value }) => p.hours?.[value]).map(({ value }) => [value, p.hours![value]])) : null
  return {
    sanity_id: p._id,
    name: p.name,
    category: p.category,
    description: p.description ?? null,
    address: p.address ?? null,
    phone: p.phone ?? null,
    email: p.email ?? null,
    website: p.website ?? null,
    hours: hours && Object.keys(hours).length ? hours : null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    rating: p.rating ?? 4.5,
    is_featured: Boolean(p.isFeatured),
    logo_url: p.logoUrl ?? null,
    cover_image_url: p.coverUrl ? `${p.coverUrl}?w=1200&fit=max&auto=format` : null,
    services: p.services?.length ? p.services : null,
    is_published: true,
    updated_at: new Date().toISOString(),
  }
}

/** Syncs one partner: published in Sanity → upserted on the map; unpublished or deleted → removed from the map. */
export async function syncPartner(documentId: string) {
  const id = documentId.replace(/^drafts\./, '')
  const partner = await writeClient().fetch<SanityPartner | null>(`*[_id == $id && _type == "partner"][0] ${PARTNER_QUERY}`, { id })
  const supabase = createAdminClient()
  if (!partner) {
    const { error } = await supabase.from('partners').delete().eq('sanity_id', id)
    if (error) throw new Error(error.message)
    return { id, action: 'removed' as const }
  }
  const row = await toRow(partner)
  const { error } = await supabase.from('partners').upsert(row, { onConflict: 'sanity_id' })
  if (error) throw new Error(error.message)
  return { id, action: 'upserted' as const, name: partner.name, located: row.latitude != null }
}

/** Full resync: every published Sanity partner is upserted; Studio-managed rows that no longer exist are removed. */
export async function syncAllPartners() {
  const partners = await writeClient().fetch<SanityPartner[]>(`*[_type == "partner" && !(_id in path("drafts.**"))] ${PARTNER_QUERY}`)
  const supabase = createAdminClient()
  const rows = []
  for (const p of partners) rows.push(await toRow(p)) // sequential: respects the geocoder's 1 request/second
  if (rows.length) {
    const { error } = await supabase.from('partners').upsert(rows, { onConflict: 'sanity_id' })
    if (error) throw new Error(error.message)
  }
  const { data: managed, error: listError } = await supabase.from('partners').select('sanity_id').not('sanity_id', 'is', null)
  if (listError) throw new Error(listError.message)
  const keep = new Set(partners.map((p) => p._id))
  const stale = (managed ?? []).map((r) => r.sanity_id as string).filter((sid) => !keep.has(sid))
  if (stale.length) {
    const { error } = await supabase.from('partners').delete().in('sanity_id', stale)
    if (error) throw new Error(error.message)
  }
  return { synced: rows.length, removed: stale.length, unlocated: rows.filter((r) => r.latitude == null).map((r) => r.name) }
}
