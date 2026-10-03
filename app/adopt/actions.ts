'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireUser(next: string) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) redirect(`/login?next=${encodeURIComponent(next)}`)
  return { supabase, userId }
}

export type AdoptResult = { ok?: boolean; already?: boolean; error?: string }

/**
 * Ask for one of a litter's babies, to adopt or to buy. As in the app, the request goes from one of
 * the visitor's pets (or, with none, from their family profile, created on the spot) to both
 * parents: a conversation opens with each in the GRRRR app.
 */
export async function requestLitter(litterId: string, intent: 'ADOPT' | 'BUY'): Promise<AdoptResult> {
  const { userId } = await requireUser('/adopt')
  if (!adminConfigured()) return { error: 'Adoption is not available right now.' }
  const admin = createAdminClient()

  const { data: pets } = await admin.from('pets').select('id, adopter_only').eq('owner_id', userId).order('adopter_only', { ascending: true }).order('created_at', { ascending: true }).limit(1)
  let adopterPetId = pets?.[0]?.id as string | undefined
  if (!adopterPetId) {
    // No pet yet: the family profile of the app's adopter mode (migration 015).
    const { data: profile } = await admin.from('profiles').select('display_name, avatar_url').eq('user_id', userId).maybeSingle()
    const { data: member } = await admin.from('grr_members').select('display_name, username').eq('id', userId).maybeSingle()
    const name = (profile?.display_name || member?.display_name || member?.username || 'Grr family').slice(0, 40)
    const { data: created, error } = await admin
      .from('pets')
      .insert({ owner_id: userId, pet_name: name, species: 'dog', breed: '', age: 0, city: '', bio: '', photo_url: profile?.avatar_url ?? '', adopter_only: true, setup_pending: false, energy: 2, mode: 0, tags: [] })
      .select('id')
      .single()
    if (error || !created) return { error: 'Your family profile could not be created. Try again in a moment.' }
    adopterPetId = created.id
  }

  const { data: sent, error } = await admin.rpc('send_adoption_request', { p_litter_id: litterId, p_adopter_pet_id: adopterPetId, p_intent: intent })
  if (error) return { error: 'The request could not be sent. Try again in a moment.' }
  revalidatePath('/adopt')
  // false: already asked, or one of the parents is the visitor's own pet.
  return sent ? { ok: true } : { already: true }
}

export type FormState = { error?: string; ok?: boolean } | undefined

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? '').trim().slice(0, max)

/** Post a pet to give. The photo is uploaded from the browser first (pet-photos/<user id>/…). */
export async function createListing(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser('/adopt/give/new')
  const row = {
    owner_id: userId,
    pet_name: text(formData, 'pet_name', 40),
    species: text(formData, 'species', 30) || 'other',
    breed: text(formData, 'breed', 60),
    age: text(formData, 'age', 30),
    gender: (['M', 'F'].includes(String(formData.get('gender'))) ? String(formData.get('gender')) : 'U') as 'M' | 'F' | 'U',
    city: text(formData, 'city', 60),
    story: text(formData, 'story', 1200),
    photo_url: text(formData, 'photo_url', 500),
    vaccinated: formData.get('vaccinated') === 'on',
    sterilized: formData.get('sterilized') === 'on',
  }
  if (!row.pet_name) return { error: 'Give your pet’s name.' }
  if (row.city.length < 2) return { error: 'Say which city the pet is in.' }
  if (row.story.length < 20) return { error: 'Tell their story in a few sentences (20 characters at least).' }
  if (row.photo_url && !row.photo_url.includes(`/pet-photos/${userId}/`)) return { error: 'The photo could not be checked. Pick it again.' }

  const { data, error } = await supabase.from('rehoming_listings').insert(row).select('id').single()
  if (error) return { error: error.message.includes('LISTING_LIMIT') ? 'You already have 5 pets listed. Mark one as adopted or remove it first.' : 'The listing could not be saved. Try again in a moment.' }
  revalidatePath('/adopt')
  redirect(`/adopt/give/${data.id}?posted=1`)
}

/** Ask the owner for a pet to give: a message and a way to reach the visitor. */
export async function requestListing(listingId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser(`/adopt/give/${listingId}`)
  const message = text(formData, 'message', 800)
  const contact = text(formData, 'contact', 120)
  if (message.length < 10) return { error: 'Say a few words about you and your home (10 characters at least).' }
  if (contact.length < 3) return { error: 'Leave a way for the owner to reach you (phone or e-mail).' }
  const { error } = await supabase.from('rehoming_requests').insert({ listing_id: listingId, requester_id: userId, message, contact })
  if (error) return { error: error.code === '23505' ? 'You already sent a request for this pet.' : 'The request could not be sent: the pet may no longer be available.' }
  revalidatePath(`/adopt/give/${listingId}`)
  return { ok: true }
}

/** The owner marks a listing as reserved, adopted (it leaves the page), open again, or removes it. */
export async function setListingStatus(listingId: string, status: 'open' | 'reserved' | 'adopted' | 'closed') {
  const { supabase } = await requireUser('/adopt/mine')
  await supabase.from('rehoming_listings').update({ status, updated_at: new Date().toISOString() }).eq('id', listingId)
  revalidatePath('/adopt')
  revalidatePath('/adopt/mine')
}

export async function deleteListing(listingId: string) {
  const { supabase } = await requireUser('/adopt/mine')
  await supabase.from('rehoming_listings').delete().eq('id', listingId)
  revalidatePath('/adopt')
  revalidatePath('/adopt/mine')
}
