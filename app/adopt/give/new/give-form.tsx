'use client'

import { useActionState, useState } from 'react'
import { ArrowUpRight, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GIVE_SPECIES } from '@/lib/adopt/constants'
import { createListing, type FormState } from '../../actions'

/** The photo goes straight to the pet-photos bucket, in the member's own folder (storage policies). */
async function uploadPhoto(userId: string, file: File) {
  const supabase = createClient()
  const extension = (file.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg')
  const path = `${userId}/give-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { error } = await supabase.storage.from('pet-photos').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('pet-photos').getPublicUrl(path).data.publicUrl
}

export function GiveForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createListing, undefined)
  const [photo, setPhoto] = useState('')
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [story, setStory] = useState('')

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setPhotoError('Pick an image.')
    if (file.size > 8 * 1024 * 1024) return setPhotoError('The photo is too heavy (8 MB at most).')
    setPhotoError(''); setUploading(true)
    try {
      setPhoto(await uploadPhoto(userId, file))
    } catch {
      setPhotoError('The photo could not be sent. Try another one.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form action={action} className="thread-form give-form">
      <label className="give-upload">
        {photo ? <img src={photo} alt="" /> : <span><Camera size={28} />{uploading ? 'Sending the photo…' : 'Add a photo'}</span>}
        <input type="file" accept="image/*" onChange={pick} hidden />
      </label>
      {photoError && <p className="form-error">{photoError}</p>}
      <input type="hidden" name="photo_url" value={photo} />

      <div className="thread-form-row">
        <div><label htmlFor="pet_name">Name</label><input id="pet_name" name="pet_name" maxLength={40} required placeholder="Biscuit" /></div>
        <div>
          <label htmlFor="species">Animal</label>
          <select id="species" name="species" defaultValue="dog">{GIVE_SPECIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
      </div>
      <div className="thread-form-row">
        <div><label htmlFor="breed">Breed</label><input id="breed" name="breed" maxLength={60} placeholder="Beagle, crossbreed…" /></div>
        <div><label htmlFor="age">Age</label><input id="age" name="age" maxLength={30} placeholder="2 years, 6 months…" /></div>
      </div>
      <div className="thread-form-row">
        <div>
          <label htmlFor="gender">Sex</label>
          <select id="gender" name="gender" defaultValue="U"><option value="F">Female</option><option value="M">Male</option><option value="U">I don’t know</option></select>
        </div>
        <div><label htmlFor="city">City</label><input id="city" name="city" maxLength={60} required placeholder="Bordeaux" /></div>
      </div>
      <label htmlFor="story">Their story</label>
      <textarea id="story" name="story" rows={6} maxLength={1200} required value={story} onChange={(e) => setStory(e.target.value)} placeholder="Character, habits, why you’re looking for a new home, what kind of family would suit them…" />
      <small className="counter">{story.length} / 1200</small>
      <label className="checkbox"><input type="checkbox" name="vaccinated" /> Vaccinated</label>
      <label className="checkbox"><input type="checkbox" name="sterilized" /> Neutered</label>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="button button-dark" type="submit" disabled={pending || uploading}>{pending ? 'Posting…' : 'Post this pet'} <ArrowUpRight size={16} /></button>
    </form>
  )
}
