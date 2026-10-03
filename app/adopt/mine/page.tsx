import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { myListings, speciesEmoji } from '@/lib/adopt/data'
import { timeAgo } from '@/lib/community/threads'
import { getCurrentProfile } from '@/lib/supabase/server'
import { deleteListing, setListingStatus } from '../actions'

export const metadata: Metadata = { title: 'My listings — Grr Adopt' }

const STATUS = { open: 'Looking for a home', reserved: 'Reserved', adopted: 'Adopted 🎉', closed: 'Removed' } as const

export default async function MyListingsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/adopt/mine')
  const listings = await myListings(profile.id)

  return (
    <main className="site-shell adopt-shell">
      <SiteHeader />
      <section className="mine-page container">
        <Link className="text-link" href="/adopt"><ArrowLeft size={16} /> Adopt</Link>
        <div className="adopt-section-head">
          <div>
            <div className="eyebrow new-thread-eyebrow"><span className="signal warm" /> My listings</div>
            <h2>Your pets<br /><em>and their requests.</em></h2>
          </div>
          <Link className="button button-dark" href="/adopt/give/new"><Plus size={16} /> Give a pet</Link>
        </div>

        {listings.length === 0 && <div className="adopt-empty"><span>🏡</span><p>You haven’t posted a pet to give.</p></div>}

        {listings.map((listing) => (
          <article key={listing.id} className="mine-card">
            <div className="mine-head">
              <div className="mine-photo">{listing.photo_url ? <img src={listing.photo_url} alt="" /> : <span>{speciesEmoji(listing.species)}</span>}</div>
              <div className="mine-title">
                <h3><Link href={`/adopt/give/${listing.id}`}>{listing.pet_name}</Link></h3>
                <span className={`mine-status status-${listing.status}`}>{STATUS[listing.status]}</span>
              </div>
              <div className="mine-buttons">
                {listing.status !== 'open' && <form action={setListingStatus.bind(null, listing.id, 'open')}><button className="link-muted" type="submit">Open again</button></form>}
                {listing.status === 'open' && <form action={setListingStatus.bind(null, listing.id, 'reserved')}><button className="link-muted" type="submit">Mark reserved</button></form>}
                {listing.status !== 'adopted' && <form action={setListingStatus.bind(null, listing.id, 'adopted')}><button className="link-muted" type="submit">Mark adopted</button></form>}
                <form action={deleteListing.bind(null, listing.id)}><button className="link-danger" type="submit">Delete</button></form>
              </div>
            </div>
            <h4>{listing.requests.length} {listing.requests.length === 1 ? 'request' : 'requests'}</h4>
            {listing.requests.length === 0 && <p className="give-note">No request yet. Share the page of {listing.pet_name} to reach more people.</p>}
            {listing.requests.map((request) => (
              <div key={request.id} className="comment">
                <div className="comment-head"><strong>{request.requester}</strong><span>{timeAgo(request.created_at)}</span></div>
                <p>{request.message}</p>
                <p className="mine-contact">📞 {request.contact}</p>
              </div>
            ))}
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  )
}
