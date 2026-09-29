import type { Metadata } from 'next'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ThreadCard } from '@/components/thread-card'
import { listThreads, THREAD_CATEGORIES, type ThreadSort } from '@/lib/community/threads'
import { supabaseConfigured } from '@/lib/supabase/env'
import { getCurrentProfile } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Threads — Grr', description: 'Short, surprising stories about the animals we love — history, culture, science and more, shared by the Grr community.' }

export default async function ThreadsPage({ searchParams }: { searchParams: Promise<{ sort?: string; category?: string }> }) {
  const { sort: sortParam, category } = await searchParams
  const sort: ThreadSort = sortParam === 'top' || sortParam === 'trending' ? sortParam : 'new'
  const [threads, profile] = await Promise.all([listThreads({ sort, category }), getCurrentProfile()])
  const href = (params: { sort?: string; category?: string }) => {
    const q = new URLSearchParams({ ...(sort !== 'new' ? { sort } : {}), ...(category ? { category } : {}), ...params })
    for (const [k, v] of [...q.entries()]) if (!v || (k === 'sort' && v === 'new')) q.delete(k)
    return `/threads${q.size ? `?${q}` : ''}`
  }

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="threads-page container">
        <div className="stories-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> The Grr community</div>
            <h2>Little stories,<br /><em>big hearts.</em></h2>
          </div>
          <Link className="button button-dark" href="/threads/new"><PenLine size={16} /> Post a thread</Link>
        </div>

        <div className="thread-filters">
          <div className="thread-tabs">
            <Link href={href({ sort: 'new' })} className={sort === 'new' ? 'active' : ''}>Latest</Link>
            <Link href={href({ sort: 'trending' })} className={sort === 'trending' ? 'active' : ''}>Trending</Link>
            <Link href={href({ sort: 'top' })} className={sort === 'top' ? 'active' : ''}>Top of all time</Link>
          </div>
          <div className="thread-chips">
            <Link href={href({ category: '' })} className={!category ? 'active' : ''}>All</Link>
            {Object.entries(THREAD_CATEGORIES).map(([key, label]) => (
              <Link key={key} href={href({ category: key })} className={category === key ? 'active' : ''}>{label}</Link>
            ))}
          </div>
        </div>

        {!supabaseConfigured && <p className="guide-empty">The community isn’t open yet — come back soon.</p>}
        {supabaseConfigured && threads.length === 0 && (sort === 'trending'
          ? <p className="guide-empty">Nothing trending yet. <Link className="text-link" href={href({ sort: 'new' })}>Upvote the threads you like</Link></p>
          : <p className="guide-empty">No threads here yet. <Link className="text-link" href="/threads/new">Be the first to post one</Link></p>)}
        <div className="thread-list">
          {threads.map((thread) => <ThreadCard key={thread.id} thread={thread} signedIn={Boolean(profile)} />)}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
