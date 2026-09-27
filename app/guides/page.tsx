import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { getAllGuides } from '@/lib/content/store'

export const revalidate = 60
export const metadata: Metadata = { title: 'Guides — Grr', description: 'Real questions from pet people, turned into useful guides.' }

const accents = ['coral', 'sage', 'yellow']

export default async function GuidesPage() {
  const guides = await getAllGuides()
  return (
    <main className="site-shell">
      <section className="stories section container">
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Back to Grr</Link>
        <div className="stories-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> From the Grr journal</div><h2>Useful things,<br /><em>beautifully told.</em></h2></div></div>
        {guides.length === 0 ? <p className="guide-empty">No guides yet — the first ones are on their way.</p> : (
          <div className="story-grid">
            {guides.map((guide, index) => (
              <Link className="story-card" href={`/guides/${guide.slug}`} key={guide._id}>
                <div className={`story-art art-${accents[index % accents.length]}`}><span className="story-art-label">{guide.question || guide.excerpt}</span><div className="abstract-shape" /></div>
                <div className="story-meta"><span>{guide.category}</span><span>{guide.readMinutes} min read</span></div>
                <h3>{guide.title}</h3>
                <span className="story-read">Read guide <ArrowUpRight size={15} /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
