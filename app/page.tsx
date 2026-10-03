import Link from 'next/link'
import { ArrowBigUp, ArrowUpRight, BookOpen, Bone, ChevronRight, Heart, MessagesSquare, PawPrint, PenLine, Plus, Users } from 'lucide-react'
import { ListingCard, LitterTile } from '@/components/adopt/cards'
import { listLitters, listRehoming } from '@/lib/adopt/data'
import { NewsletterForm } from '@/components/newsletter-form'
import { ProductShowcase } from '@/components/product-showcase'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { listThreads, THREAD_CATEGORIES } from '@/lib/community/threads'
import { KnowledgeFlow } from '@/components/knowledge-flow'
import type { Guide } from '@/lib/content/schema'
import { getAllGuides } from '@/lib/content/store'
import { PRODUCTS } from '@/lib/products'

// Shown until enough AI guides exist to fill the three cards.
const placeholderStories = [
  { category: 'BEHAVIOUR', title: 'Why does my dog eat grass?', read: '6 min read', label: 'A question worth asking', href: '#stories' },
  { category: 'PUPPY LIFE', title: 'The first 30 days with your new puppy', read: '8 min read', label: 'A new beginning', href: '#stories' },
  { category: 'WELLBEING', title: 'A calmer, richer life for indoor cats', read: '5 min read', label: 'The everyday ritual', href: '#stories' },
]

const ANIMAL_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', rabbit: '🐰', rodent: '🐹', bird: '🐦', fish: '🐟', reptile: '🦎', horse: '🐴', ferret: '🦦', farm: '🐔' }

function latestStories(all: Guide[]) {
  const guides = all.slice(0, 4).map((guide) => ({ category: `${ANIMAL_EMOJI[guide.animal ?? ''] ?? '🐾'} ${guide.category}`, title: guide.title, read: `${guide.readMinutes} min read`, label: guide.question, href: `/guides/${guide.slug}` }))
  return [...guides, ...placeholderStories.slice(guides.length)]
}

/** What the community upvotes right now; the latest threads until anything has been upvoted. */
async function trendingThreads() {
  const trending = await listThreads({ sort: 'trending', limit: 3 })
  return trending.length ? trending : listThreads({ limit: 3 })
}

export default async function Page() {
  const [guides, threads, litters, listings] = await Promise.all([
    getAllGuides().catch(() => [] as Guide[]),
    trendingThreads(),
    listLitters(6).catch(() => []),
    listRehoming(6).catch(() => []),
  ])
  const stories = latestStories(guides)
  // The questions behind real guides feed the knowledge-loop animation
  const knowledgeStories = guides.filter((g) => g.question).slice(0, 8).map((g) => ({ question: g.question!.trim(), guide: g.title }))
  return (
    <main className="site-shell">
      <SiteHeader />

      <section id="top" className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> The pet life ecosystem</div>
          <h1>Better days<br /><em>together.</em></h1>
          <p className="hero-lede">Grr is a living ecosystem for the people and animals who make life feel more like life.</p>
          <div className="hero-actions">
            <Link className="button button-adopt" href="/adopt"><Heart size={16} /> Adopt a pet</Link>
            <a className="button button-dark" href="#ecosystem">Discover Grr <ArrowUpRight size={16} /></a>
            <a className="text-link" href="#stories">Read our stories <ChevronRight size={16} /></a>
          </div>
          <div className="hero-apps" aria-label="The Grr apps">
            {PRODUCTS.map((p) => { const Icon = p.icon; return <a key={p.id} href={`#${p.id}`} className={`hero-app ${p.color}`}><Icon size={15} /> {p.name}</a> })}
          </div>
          <a className="hero-note" href="#knowledge"><span className="signal" /> Powered by real questions from real pet people</a>
        </div>
        <div className="hero-visual">
          <div className="hero-image-wrap"><img src="/grr-hero-dog.png" alt="Golden retriever running through a sunny meadow" /></div>
          <div className="hero-sticker"><PawPrint size={19} /><span>Made for<br /><strong>good company.</strong></span></div>
          <div className="hero-caption">For every walk, wonder<br />and everything in between <span>↗</span></div>
        </div>
      </section>

      <section className="ticker" aria-label="Grr mission">
        <div className="ticker-track"><span>CARE DEEPLY</span><Bone size={19} /><span>LIVE CURIOUSLY</span><PawPrint size={18} /><span>STAY CLOSE</span><Bone size={19} /><span>CARE DEEPLY</span><PawPrint size={18} /></div>
      </section>

      {/* ---------- Adopt: what is live right now ---------- */}
      <section id="adopt" className="home-adopt">
        <div className="container">
          <div className="adopt-section-head">
            <div>
              <div className="eyebrow"><span className="signal warm" /> Grr Adopt</div>
              <h2>Every pet deserves<br /><em>a good home.</em></h2>
            </div>
            <div className="home-adopt-aside">
              <p>Future babies of couples who met on GRRRR, to adopt or to buy — and pets whose owners are looking for a loving new family.</p>
              <div className="home-adopt-stats">
                <span><b>{litters.length}</b> litters to come</span>
                <span><b>{listings.length}</b> pets to give</span>
              </div>
            </div>
          </div>
          <div className="home-adopt-grid">
            {litters.slice(0, 3).map((litter) => <LitterTile key={litter.id} litter={litter} />)}
            {listings.slice(0, Math.max(0, 6 - Math.min(litters.length, 3))).map((listing) => <ListingCard key={listing.id} listing={listing} />)}
            {litters.length + listings.length === 0 && (
              <div className="adopt-empty"><span>🐾</span><p>The first pets are on their way. Know one looking for a home?</p></div>
            )}
          </div>
          <div className="home-adopt-actions">
            <Link className="button button-adopt" href="/adopt">See every pet <ArrowUpRight size={16} /></Link>
            <Link className="text-link" href="/adopt/give/new"><Plus size={14} /> Give a pet</Link>
          </div>
        </div>
      </section>

      <section id="ecosystem" className="ecosystem section container">
        <div className="flow-rail" aria-hidden="true" />
        <div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> One home for pet life</div><h2>Everything they need.<br /><em>Everything you need.</em></h2><p>Three apps, one family: meet, look after and spoil the animals you love.</p></div>
        <ProductShowcase />
      </section>

      <section className="knowledge-section" id="knowledge">
        <div className="knowledge-head container">
          <div>
            <div className="eyebrow light"><span className="signal" /> The Grr knowledge engine</div>
            <h2>Questions become<br /><em>better living.</em></h2>
          </div>
          <div className="knowledge-aside">
            <p>Real questions, answered together. GRRR learns from every one.</p>
            <Link className="button button-light" href="/guides">Read the guides <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className="container">
          <KnowledgeFlow stories={knowledgeStories} />
        </div>
      </section>

      <section id="stories" className="stories section container">
        <div className="flow-rail" aria-hidden="true" />
        <div className="stories-heading"><div><div className="eyebrow"><span className="signal" /> From the Grr journal</div><h2>Useful things,<br /><em>beautifully told.</em></h2></div></div>
        <div className="journal-grid">
          <div className="journal-col">
            <div className="journal-col-head"><span className="product-number">01</span><h3>Guides</h3><BookOpen size={20} /></div>
            <span className="stage-tag guide"><i />Guide</span>
            <p className="journal-col-lede">Real questions, answered properly.</p>
            {stories.map((story) => (
              <Link className="journal-item" href={story.href} key={story.title}>
                <span className="journal-item-meta">{story.category} · {story.read}</span>
                <span className="journal-item-title">{story.title}</span>
              </Link>
            ))}
            <Link className="text-link" href="/guides">All guides <ArrowUpRight size={16} /></Link>
          </div>

          <div className="journal-col">
            <div className="journal-col-head"><span className="product-number">02</span><h3>Threads</h3><MessagesSquare size={20} /></div>
            <span className="stage-tag community"><i />Community</span>
            <p className="journal-col-lede">Trending in the community — tips, stories and surprising facts, upvoted by pet people.</p>
            {threads.length === 0 && <p className="journal-empty">The first threads are on their way.</p>}
            {threads.map((thread) => (
              <Link className="journal-item" href={`/threads/${thread.id}`} key={thread.id}>
                <span className="journal-item-meta">{THREAD_CATEGORIES[thread.category]} · <ArrowBigUp size={12} /> {thread.like_count} · @{thread.author?.username}</span>
                <span className="journal-item-title">{thread.title}</span>
              </Link>
            ))}
            <Link className="text-link" href="/threads?sort=trending">All trending threads <ArrowUpRight size={16} /></Link>
          </div>

          <Link className="journal-cta" href="/threads/new">
            <div className="journal-col-head"><span className="product-number">03</span><PenLine size={20} /></div>
            <span className="stage-tag ask"><i />Ask</span>
            <h3>Know a story<br />worth telling?</h3>
            <p>An old tradition, a strange fact, a moment with your pet. Share it with the Grr community.</p>
            <span className="button button-dark">Post a thread <ArrowUpRight size={16} /></span>
          </Link>
        </div>
      </section>

      <section id="about" className="newsletter container"><div className="newsletter-icon"><Users size={26} /></div><div><div className="eyebrow"><span className="eyebrow-line" /> Stay in the loop</div><h2>Good things,<br /><em>straight to your inbox.</em></h2></div><NewsletterForm /></section>

      <SiteFooter />
    </main>
  )
}
