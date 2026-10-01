import { createAdminClient } from '../supabase/admin'
import type { PendingPartner } from './constants'
import { geocode } from './geocode'

/**
 * Establishments that filled in the public form and confirmed their e-mail: they sit in `partners`, unpublished,
 * until approved here. Rows with a sanity_id belong to the Studio and are never touched.
 */
const applications = () => createAdminClient().from('partners').select('id, name, category, description, address, phone, email, website, latitude, longitude, created_at').eq('is_published', false).is('sanity_id', null)

export async function pendingPartners(): Promise<PendingPartner[]> {
  const { data, error } = await applications().order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map(({ latitude, longitude, ...p }) => ({ ...p, located: latitude != null && longitude != null }))
}

/** Shows the establishment on the map. An address the form couldn't locate gets one more try, since a pin needs a position. */
export async function publishPartner(id: string) {
  const { data: partner, error } = await applications().eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!partner) throw new Error('Demande introuvable (déjà publiée ou refusée).')
  let { latitude, longitude } = partner
  if ((latitude == null || longitude == null) && partner.address) {
    const hit = await geocode(partner.address).catch(() => null)
    if (hit) ({ lat: latitude, lng: longitude } = hit)
  }
  const { error: updateError } = await createAdminClient().from('partners').update({ is_published: true, latitude, longitude, updated_at: new Date().toISOString() }).eq('id', id)
  if (updateError) throw new Error(updateError.message)
  return { name: partner.name as string, located: latitude != null && longitude != null }
}

export async function rejectPartner(id: string) {
  const { error } = await createAdminClient().from('partners').delete().eq('id', id).eq('is_published', false).is('sanity_id', null)
  if (error) throw new Error(error.message)
}
