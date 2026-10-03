import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Baby, HeartHandshake, Inbox, Plus } from 'lucide-react'
import { LitterCard, ListingCard } from '@/components/adopt/cards'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { listLitters, listRehoming } from '@/lib/adopt/data'
import { getCurrentProfile } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Adopt — Grr',
  description: 'Future babies of couples who met on GRRRR, to adopt or to buy, and pets looking for a new home.',
}

export default async function AdoptPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const [litters, listings, profile] = await Promise.all([listLitters(), listRehoming(), getCurrentProfile()])
  const show = tab === 'give' ? 'give' : tab === 'babies' ? 'babies' : 'all'

  return (
    <main className="site-shell adopt-shell">
      <SiteHeader />

      <section className="adopt-hero container">
        <div>
          <div className="eyebrow"><span className="signal warm" /> Grr Adopt</div>
          <h1>Find your<br /><em>next best friend.</em></h1>
          <p className="hero-lede">Future babies of couples who met on GRRRR, and pets whose owners are looking for a loving new home.</p>
          <div className="adopt-tabs" role="tablist">
            <Link href="/adopt" className={show === 'all' ? 'active' : ''}>Everything</Link>
            <Link href="/adopt?tab=babies" className={show === 'babies' ? 'active' : ''}><Baby size={14} /> Babies to come ({litters.length})</Link>
            <Link href="/adopt?tab=give" className={show === 'give' ? 'active' : ''}><HeartHandshake size={14} /> To give ({listings.length})</Link>
          </div>
        </div>
        <div className="adopt-hero-card">
          <HeartHandshake size={26} />
          <h3>Can’t keep your pet?</h3>
          <p>Post them here with a photo and their story. Only you read the requests, and you choose their new family.</p>
          <Link className="button button-dark" href="/adopt/give/new"><Plus size={16} /> Give a pet</Link>
          {profile && <Link className="text-link" href="/adopt/mine"><Inbox size={14} /> My listings & requests</Link>}
        </div>
      </section>

      {show !== 'give' && (
        <section className="adopt-section container" id="babies">
          <div className="adopt-section-head">
            <div>
              <span className="stage-tag ask"><i />Babies to come</span>
              <h2>Matched in GRRRR,<br /><em>ready for a family.</em></h2>
            </div>
            <p>A male and a female who matched in the app, and whose owners both said yes to a relationship. Ask to adopt or to buy one of their babies: your request opens a conversation with both parents in the GRRRR app.</p>
          </div>
          {litters.length === 0 ? (
            <div className="adopt-empty">
              <span>🍼</span>
              <p>No litter listed right now. Couples propose one from their chat in the GRRRR app, so come back soon.</p>
            </div>
          ) : (
            <div className="litter-grid">{litters.map((litter) => <LitterCard key={litter.id} litter={litter} signedIn={Boolean(profile)} />)}</div>
          )}
        </section>
      )}

      {show !== 'babies' && (
        <section className="adopt-section container" id="give">
          <div className="adopt-section-head">
            <div>
              <span className="stage-tag give"><i />To give</span>
              <h2>Looking for<br /><em>a new home.</em></h2>
            </div>
            <p>Pets whose owners can no longer keep them. Open a profile, tell them about you and your home, and leave a way to reach you.</p>
          </div>
          {listings.length === 0 ? (
            <div className="adopt-empty">
              <span>🏡</span>
              <p>No pet to give right now.</p>
              <Link className="text-link" href="/adopt/give/new">Post a pet <ArrowUpRight size={14} /></Link>
            </div>
          ) : (
            <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
          )}
        </section>
      )}

      <SiteFooter />
    </main>
  )
}
