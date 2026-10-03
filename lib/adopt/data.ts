import { adminConfigured, createAdminClient } from '../supabase/admin'
import { supabaseConfigured } from '../supabase/env'
import { createClient } from '../supabase/server'

// Adopt, on the website, shares the GRRRR app's database:
//  - litters: a male and a female who matched in the app and whose owners both accepted a
//    relationship (pet_litters, status "accepted"); visitors ask to adopt or to buy a baby, and
//    the request reaches both parents' chats in the app (send_adoption_request, migration 016);
//  - pets to give: posted on the website by owners who can no longer keep them
//    (rehoming_listings, migration 025), with requests only the owner reads.

export type Parent = { id: string; name: string; breed: string; age: number | null; city: string; bio: string; photo: string; gender: 'M' | 'F'; owner: string }
export type Litter = { id: string; species: string; listedAt: string; father: Parent; mother: Parent; requests: number }

type PetRow = { id: string; pet_name: string; breed: string | null; age: number | null; city: string | null; bio: string | null; photo_url: string | null; gender: string | null; owner_id: string; species: string }

/** Listed litters, newest first. Read with the server key: the parents' public profile only. */
export async function listLitters(limit = 30): Promise<Litter[]> {
  if (!adminConfigured()) return []
  const admin = createAdminClient()
  const { data: litters, error } = await admin
    .from('pet_litters')
    .select('id, created_at, responded_at, father_pet_id, mother_pet_id')
    .eq('status', 'accepted')
    .order('responded_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error || !litters?.length) return []
  const petIds = [...new Set(litters.flatMap((l) => [l.father_pet_id, l.mother_pet_id]))]
  const [{ data: pets }, { data: requests }] = await Promise.all([
    admin.from('pets').select('id, pet_name, breed, age, city, bio, photo_url, gender, owner_id, species').in('id', petIds),
    admin.from('adoption_requests').select('litter_id').eq('action', 'ADOPT').in('litter_id', litters.map((l) => l.id)),
  ])
  const ownerIds = [...new Set((pets ?? []).map((p) => p.owner_id))]
  const { data: profiles } = ownerIds.length ? await admin.from('profiles').select('user_id, display_name').in('user_id', ownerIds) : { data: [] }
  const ownerName = new Map((profiles ?? []).map((p) => [p.user_id, (p.display_name ?? '').trim()]))
  const petById = new Map((pets ?? []).map((p) => [p.id, p as PetRow]))
  const toParent = (pet: PetRow, gender: 'M' | 'F'): Parent => ({
    id: pet.id,
    name: pet.pet_name,
    breed: pet.breed ?? '',
    age: pet.age,
    city: pet.city ?? '',
    bio: pet.bio ?? '',
    photo: pet.photo_url ?? '',
    gender,
    owner: ownerName.get(pet.owner_id) ?? '',
  })
  return litters.flatMap((l) => {
    const father = petById.get(l.father_pet_id)
    const mother = petById.get(l.mother_pet_id)
    if (!father || !mother) return []
    return [{
      id: l.id,
      species: father.species,
      listedAt: l.responded_at ?? l.created_at,
      father: toParent(father, 'M'),
      mother: toParent(mother, 'F'),
      requests: (requests ?? []).filter((r) => r.litter_id === l.id).length,
    }]
  })
}

export type Listing = {
  id: string
  owner_id: string
  pet_name: string
  species: string
  breed: string
  age: string
  gender: 'M' | 'F' | 'U'
  city: string
  story: string
  photo_url: string
  vaccinated: boolean
  sterilized: boolean
  status: 'open' | 'reserved' | 'adopted' | 'closed'
  created_at: string
}

const LISTING_COLUMNS = 'id, owner_id, pet_name, species, breed, age, gender, city, story, photo_url, vaccinated, sterilized, status, created_at'

/** Pets to give that are still looking for a home. */
export async function listRehoming(limit = 60): Promise<Listing[]> {
  if (!supabaseConfigured) return []
  const supabase = await createClient()
  const { data } = await supabase.from('rehoming_listings').select(LISTING_COLUMNS).in('status', ['open', 'reserved']).order('created_at', { ascending: false }).limit(limit)
  return (data ?? []) as Listing[]
}

export async function getListing(id: string): Promise<{ listing: Listing; owner: string } | null> {
  if (!supabaseConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = await createClient()
  const { data } = await supabase.from('rehoming_listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle()
  if (!data) return null
  let owner = ''
  if (adminConfigured()) {
    const { data: profile } = await createAdminClient().from('profiles').select('display_name').eq('user_id', data.owner_id).maybeSingle()
    owner = (profile?.display_name ?? '').trim()
  }
  return { listing: data as Listing, owner }
}

export type ListingRequest = { id: string; listing_id: string; message: string; contact: string; created_at: string; requester: string }

/** The signed-in owner's listings, each with the requests received. */
export async function myListings(userId: string): Promise<(Listing & { requests: ListingRequest[] })[]> {
  const supabase = await createClient()
  const { data: listings } = await supabase.from('rehoming_listings').select(LISTING_COLUMNS).eq('owner_id', userId).order('created_at', { ascending: false })
  if (!listings?.length) return []
  const { data: requests } = await supabase.from('rehoming_requests').select('id, listing_id, message, contact, created_at, requester_id').in('listing_id', listings.map((l) => l.id)).order('created_at', { ascending: false })
  const requesterIds = [...new Set((requests ?? []).map((r) => r.requester_id))]
  const names = new Map<string, string>()
  if (requesterIds.length && adminConfigured()) {
    const { data: members } = await createAdminClient().from('grr_members').select('id, username, display_name').in('id', requesterIds)
    for (const m of members ?? []) names.set(m.id, m.display_name || `@${m.username}`)
  }
  return (listings as Listing[]).map((listing) => ({
    ...listing,
    requests: (requests ?? []).filter((r) => r.listing_id === listing.id).map((r) => ({ id: r.id, listing_id: r.listing_id, message: r.message, contact: r.contact, created_at: r.created_at, requester: names.get(r.requester_id) ?? 'A Grr member' })),
  }))
}

/** Whether the visitor already asked for this listing. */
export async function hasRequested(listingId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('rehoming_requests').select('id').eq('listing_id', listingId).eq('requester_id', userId).maybeSingle()
  return Boolean(data)
}

export { GIVE_SPECIES, SPECIES_EMOJI, speciesEmoji } from './constants'
