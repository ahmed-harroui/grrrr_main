import Link from 'next/link'
import { MapPin, Mars, ShieldCheck, Syringe, Users, Venus } from 'lucide-react'
import { speciesEmoji, type Listing, type Litter, type Parent } from '@/lib/adopt/data'
import { LitterActions } from './litter-actions'

function ParentPhoto({ parent }: { parent: Parent }) {
  return (
    <div className={`parent-photo ${parent.gender === 'M' ? 'is-father' : 'is-mother'}`}>
      {parent.photo ? <img src={parent.photo} alt={parent.name} loading="lazy" /> : <span>{parent.name.slice(0, 1)}</span>}
      <i>{parent.gender === 'M' ? <Mars size={13} /> : <Venus size={13} />}</i>
    </div>
  )
}

/** A matched couple whose owners accepted a relationship: their future babies, to adopt or to buy. */
export function LitterCard({ litter, signedIn }: { litter: Litter; signedIn: boolean }) {
  const { father, mother } = litter
  const breeds = father.breed && mother.breed && father.breed !== mother.breed ? `${father.breed} × ${mother.breed}` : father.breed || mother.breed
  const city = father.city || mother.city
  return (
    <article className="litter-card">
      <div className="litter-parents">
        <ParentPhoto parent={father} />
        <span className="litter-heart">💞</span>
        <ParentPhoto parent={mother} />
      </div>
      <div className="litter-body">
        <span className="litter-kicker">{speciesEmoji(litter.species)} Future babies</span>
        <h3>{father.name} <em>&</em> {mother.name}</h3>
        <p className="litter-meta">
          {breeds && <span>{breeds}</span>}
          {city && <span><MapPin size={12} /> {city}</span>}
          {litter.requests > 0 && <span><Users size={12} /> {litter.requests} {litter.requests === 1 ? 'family' : 'families'} interested</span>}
        </p>
        {(father.bio || mother.bio) && (
          <div className="litter-bios">
            {father.bio && <p><strong>{father.name}</strong> {father.bio}</p>}
            {mother.bio && <p><strong>{mother.name}</strong> {mother.bio}</p>}
          </div>
        )}
        <LitterActions litterId={litter.id} signedIn={signedIn} parents={`${father.name} and ${mother.name}`} />
      </div>
    </article>
  )
}

/** A compact litter for the home page: the two parents and a link to Adopt. */
export function LitterTile({ litter }: { litter: Litter }) {
  return (
    <Link href="/adopt?tab=babies" className="litter-tile">
      <div className="litter-parents small">
        <ParentPhoto parent={litter.father} />
        <span className="litter-heart">💞</span>
        <ParentPhoto parent={litter.mother} />
      </div>
      <strong>{litter.father.name} & {litter.mother.name}</strong>
      <span>{speciesEmoji(litter.species)} Future babies · adopt or buy</span>
    </Link>
  )
}

const GENDER = { M: 'Male', F: 'Female', U: '' } as const

/** A pet looking for a new home, posted by its owner. */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/adopt/give/${listing.id}`} className="listing-card">
      <div className="listing-photo">
        {listing.photo_url ? <img src={listing.photo_url} alt={listing.pet_name} loading="lazy" /> : <span>{speciesEmoji(listing.species)}</span>}
        {listing.status === 'reserved' && <b className="listing-badge">Reserved</b>}
      </div>
      <div className="listing-body">
        <h3>{listing.pet_name}</h3>
        <p className="litter-meta">
          <span>{speciesEmoji(listing.species)} {[listing.breed, GENDER[listing.gender], listing.age].filter(Boolean).join(' · ') || 'To give'}</span>
          <span><MapPin size={12} /> {listing.city}</span>
        </p>
        <p className="listing-story">{listing.story}</p>
        <p className="listing-health">
          {listing.vaccinated && <span><Syringe size={12} /> Vaccinated</span>}
          {listing.sterilized && <span><ShieldCheck size={12} /> Neutered</span>}
        </p>
      </div>
    </Link>
  )
}
