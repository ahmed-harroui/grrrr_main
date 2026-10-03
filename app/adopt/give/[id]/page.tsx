import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check, MapPin, ShieldCheck, Syringe } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getListing, hasRequested, speciesEmoji } from '@/lib/adopt/data'
import { getCurrentProfile } from '@/lib/supabase/server'
import { RequestForm } from './request-form'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await getListing((await params).id)
  return data ? { title: `${data.listing.pet_name} is looking for a home — Grr`, description: data.listing.story.slice(0, 155) } : {}
}

const GENDER = { M: 'Male', F: 'Female', U: 'Unknown' } as const

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const [{ id }, { posted }] = await Promise.all([params, searchParams])
  const [data, profile] = await Promise.all([getListing(id), getCurrentProfile()])
  if (!data) notFound()
  const { listing, owner } = data
  const isOwner = profile?.id === listing.owner_id
  const asked = profile && !isOwner ? await hasRequested(listing.id, profile.id) : false

  return (
    <main className="site-shell adopt-shell">
      <SiteHeader />
      <section className="give-page container">
        <Link className="text-link" href="/adopt?tab=give"><ArrowLeft size={16} /> All pets to give</Link>
        {posted && <div className="litter-sent give-posted"><Check size={16} /><span>{listing.pet_name} is online. Requests will show up in <Link href="/adopt/mine">My listings</Link>.</span></div>}

        <div className="give-layout">
          <div className="give-photo">
            {listing.photo_url ? <img src={listing.photo_url} alt={listing.pet_name} /> : <span>{speciesEmoji(listing.species)}</span>}
          </div>
          <div className="give-info">
            <span className="stage-tag give"><i />{listing.status === 'reserved' ? 'Reserved' : 'To give'}</span>
            <h1>{listing.pet_name}</h1>
            <p className="litter-meta">
              <span>{speciesEmoji(listing.species)} {[listing.breed, GENDER[listing.gender], listing.age].filter(Boolean).join(' · ')}</span>
              <span><MapPin size={12} /> {listing.city}</span>
            </p>
            <p className="listing-health">
              <span className={listing.vaccinated ? '' : 'off'}><Syringe size={12} /> {listing.vaccinated ? 'Vaccinated' : 'Not vaccinated'}</span>
              <span className={listing.sterilized ? '' : 'off'}><ShieldCheck size={12} /> {listing.sterilized ? 'Neutered' : 'Not neutered'}</span>
            </p>
            <div className="give-story">{listing.story.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
            {owner && <p className="give-owner">Posted by {owner}</p>}

            {isOwner ? (
              <Link className="button button-dark" href="/adopt/mine">Manage this listing</Link>
            ) : listing.status !== 'open' ? (
              <p className="give-note">{listing.pet_name} is reserved for a family. Look at the other pets to give.</p>
            ) : !profile ? (
              <Link className="button button-dark" href={`/login?next=/adopt/give/${listing.id}`}>Sign in to ask for {listing.pet_name}</Link>
            ) : asked ? (
              <div className="litter-sent"><Check size={16} /><span>You asked for {listing.pet_name}. The owner will contact you.</span></div>
            ) : (
              <RequestForm listingId={listing.id} petName={listing.pet_name} />
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
