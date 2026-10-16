'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'

// What the moderation page does to one pet (GRRRR migration 030). The slider keeps its own list:
// nothing reloads under the admin while they go through the profiles. Admins only: the database
// functions are only open to the server's key, and each action checks the visitor first.

export type BanReason = 'person_name' | 'insult' | 'photo' | 'other'

async function admin() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') throw new Error('Réservé aux admins.')
  return createAdminClient()
}

export async function banPet(petId: string, reason: BanReason) {
  const db = await admin()
  const { error } = await db.rpc('admin_ban_pet', { p_pet_id: petId, p_reason: reason })
  if (error) throw new Error(error.message)
}

export async function unbanPet(petId: string) {
  const db = await admin()
  const { error } = await db.rpc('admin_unban_pet', { p_pet_id: petId })
  if (error) throw new Error(error.message)
}

export async function approvePet(petId: string) {
  const db = await admin()
  const { error } = await db.rpc('admin_approve_pet', { p_pet_id: petId })
  if (error) throw new Error(error.message)
}

/**
 * Is it really hidden? Asked with the admin's own session, like any signed-in account of the apps
 * (the read rules apply, unlike with the server's key): a hidden pet must not come back.
 */
export async function checkHidden(petId: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') throw new Error('Réservé aux admins.')
  const supabase = await createClient()
  const { data, error } = await supabase.from('pets').select('id, owner_id').eq('id', petId)
  if (error) throw new Error(error.message)
  const row = data?.[0]
  return { visible: Boolean(row), mine: row?.owner_id === profile.id }
}
