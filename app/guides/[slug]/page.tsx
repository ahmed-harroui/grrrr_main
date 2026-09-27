import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText } from 'next-sanity'
import { ArrowLeft, Stethoscope } from 'lucide-react'
import { getAllGuides, getGuide } from '@/lib/content/store'

export const revalidate = 60

export async function generateStaticParams() {
  return (await getAllGuides()).map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = await getGuide((await params).slug)
  return guide ? { title: `${guide.title} — Grr`, description: guide.excerpt } : {}
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await getGuide((await params).slug)
  if (!guide) notFound()
  return (
    <main className="site-shell">
      <article className="guide container">
        <Link className="text-link" href="/guides"><ArrowLeft size={16} /> All guides</Link>
        <div className="eyebrow guide-eyebrow"><span className="eyebrow-line" /> {guide.category} · {guide.readMinutes} min read</div>
        <h1>{guide.title}</h1>
        <p className="guide-lede">{guide.excerpt}</p>
        <div className="guide-body"><PortableText value={guide.body} /></div>
        {guide.vetNote && <aside className="guide-vet"><Stethoscope size={20} /><p><strong>When to see a vet.</strong> {guide.vetNote}</p></aside>}
      </article>
    </main>
  )
}
