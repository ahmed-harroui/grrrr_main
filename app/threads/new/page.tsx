import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { getCurrentProfile } from '@/lib/supabase/server'
import { NewThreadForm } from './new-thread-form'

export const dynamic = 'force-dynamic' // depends on who is signed in
export const metadata: Metadata = { title: 'Post a thread — Grr' }

export default async function NewThreadPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/threads/new')
  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="thread-page container">
        <Link className="text-link" href="/threads"><ArrowLeft size={16} /> All threads</Link>
        <div className="eyebrow new-thread-eyebrow"><span className="eyebrow-line" /> Post a thread</div>
        <h1 className="new-thread-title">Tell us something<br /><em>worth knowing.</em></h1>
        <p className="auth-lede">A piece of history, a cultural tradition, a surprising fact or a little story about the animals we love. Keep it short, true and kind.</p>
        <NewThreadForm isAdmin={profile.role === 'admin'} />
      </section>
    </main>
  )
}
