import Link from 'next/link'
import { ArrowUpRight, BookOpen, Bone, ChevronRight, Heart, MessagesSquare, PawPrint, PenLine, Sparkles, Store, Stethoscope, Users } from 'lucide-react'
import { NewsletterForm } from '@/components/newsletter-form'
import { SiteHeader } from '@/components/site-header'
import { listThreads, THREAD_CATEGORIES } from '@/lib/community/threads'
import { getAllGuides } from '@/lib/content/store'

const products = [
  { icon: Heart, label: 'Grr Dating', description: 'Find the right connections for you and your pet.', color: 'coral' },
  { icon: Stethoscope, label: 'Grr Care', description: 'An intelligent companion for their everyday wellbeing.', color: 'sage' },
  { icon: Store, label: 'Grr Store', description: 'Thoughtful products for a happier pet life.', color: 'yellow' },
]

// Shown until enough AI guides exist to fill the three cards.
const placeholderStories = [
  { category: 'BEHAVIOUR', title: 'Why does my dog eat grass?', read: '6 min read', label: 'A question worth asking', href: '#stories' },
  { category: 'PUPPY LIFE', title: 'The first 30 days with your new puppy', read: '8 min read', label: 'A new beginning', href: '#stories' },
  { category: 'WELLBEING', title: 'A calmer, richer life for indoor cats', read: '5 min read', label: 'The everyday ritual', href: '#stories' },
]

async function latestStories() {
  const guides = (await getAllGuides().catch(() => [])).slice(0, 3).map((guide) => ({ category: guide.category, title: guide.title, read: `${guide.readMinutes} min read`, label: guide.question, href: `/guides/${guide.slug}` }))
  return [...guides, ...placeholderStories.slice(guides.length)]
}

export default async function Page() {
  const [stories, threads] = await Promise.all([latestStories(), listThreads({ sort: 'top', limit: 3 })])
  return (
    <main className="site-shell">
      <SiteHeader />

      <section id="top" className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> The pet life ecosystem</div>
          <h1>Better days<br /><em>together.</em></h1>
          <p className="hero-lede">Grr is a living ecosystem for the people and animals who make life feel more like life.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#ecosystem">Discover Grr <ArrowUpRight size={16} /></a>
            <a className="text-link" href="#stories">Read our stories <ChevronRight size={16} /></a>
          </div>
          <div className="hero-note"><Sparkles size={15} /> Powered by real questions from real pet people</div>
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

      <section id="ecosystem" className="ecosystem section container">
        <div className="section-intro"><div className="eyebrow"><span className="eyebrow-line" /> One home for pet life</div><h2>Everything they need.<br /><em>Everything you need.</em></h2><p>From the first hello to every day after, Grr brings the best parts of pet life into one thoughtful place.</p></div>
        <div className="product-grid" id="apps">
          {products.map((product, index) => { const Icon = product.icon; return <a className={`product-card ${product.color}`} href="#stories" key={product.label}><div className="product-top"><span className="product-number">0{index + 1}</span><span className="round-arrow"><ArrowUpRight size={17} /></span></div><div className="product-icon"><Icon size={26} strokeWidth={1.8} /></div><h3>{product.label}</h3><p>{product.description}</p><span className="card-link">Explore <ChevronRight size={15} /></span></a> })}
        </div>
      </section>

      <section className="knowledge-section">
        <div className="knowledge-inner container"><div className="knowledge-copy"><div className="eyebrow light"><span className="eyebrow-line" /> The Grr knowledge engine</div><h2>Questions become<br /><em>better living.</em></h2><p>Grr listens to the questions pet people ask, finds what matters, and turns it into something useful — a guide, a conversation, a little more confidence.</p><a className="button button-light" href="#stories">See how it works <ArrowUpRight size={16} /></a></div><div className="orbit-card"><div className="orbit-center"><PawPrint size={28} /><span>Grr<br /><small>knowledge</small></span></div><div className="orbit-node node-a">Questions</div><div className="orbit-node node-b">Insights</div><div className="orbit-node node-c">Guides</div><div className="orbit-node node-d">Care</div><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /></div></div>
      </section>

      <section id="stories" className="stories section container">
        <div className="stories-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> From the Grr journal</div><h2>Useful things,<br /><em>beautifully told.</em></h2></div></div>
        <div className="journal-grid">
          <div className="journal-col">
            <div className="journal-col-head"><span className="product-number">01</span><h3>Guides</h3><BookOpen size={20} /></div>
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
            <p className="journal-col-lede">Little stories from the community — history, culture, surprising facts.</p>
            {threads.length === 0 && <p className="journal-empty">The first threads are on their way.</p>}
            {threads.map((thread) => (
              <Link className="journal-item" href={`/threads/${thread.id}`} key={thread.id}>
                <span className="journal-item-meta">{THREAD_CATEGORIES[thread.category]} · <Heart size={11} /> {thread.like_count} · @{thread.author?.username}</span>
                <span className="journal-item-title">{thread.title}</span>
              </Link>
            ))}
            <Link className="text-link" href="/threads">All threads <ArrowUpRight size={16} /></Link>
          </div>

          <Link className="journal-cta" href="/threads/new">
            <div className="journal-col-head"><span className="product-number">03</span><PenLine size={20} /></div>
            <h3>Know a story<br />worth telling?</h3>
            <p>An old tradition, a strange fact, a moment with your pet. Share it with the Grr community.</p>
            <span className="button button-dark">Post a thread <ArrowUpRight size={16} /></span>
          </Link>
        </div>
      </section>

      <section id="about" className="newsletter container"><div className="newsletter-icon"><Users size={26} /></div><div><div className="eyebrow"><span className="eyebrow-line" /> Stay in the loop</div><h2>Good things,<br /><em>straight to your inbox.</em></h2></div><NewsletterForm /></section>

      <footer className="footer container"><a className="wordmark" href="#top"><span className="wordmark-mark"><PawPrint size={18} strokeWidth={2.5} /></span>grr<span className="wordmark-dot">.</span></a><p>For the love of good company.</p><div className="footer-links"><a href="#ecosystem">Ecosystem</a><a href="#stories">Journal</a><a href="#about">Contact</a><a href="#top">Instagram ↗</a></div></footer>
    </main>
  )
}
