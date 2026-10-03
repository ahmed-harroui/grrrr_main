import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getCurrentProfile } from '@/lib/supabase/server'
import { GiveForm } from './give-form'

export const metadata: Metadata = { title: 'Give a pet — Grr', description: 'Find a loving new home for a pet you can no longer keep.' }

export default async function GivePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/adopt/give/new')
  return (
    <main className="site-shell adopt-shell">
      <SiteHeader />
      <section className="auth container give-new">
        <Link className="text-link" href="/adopt?tab=give"><ArrowLeft size={16} /> Adopt</Link>
        <div className="eyebrow new-thread-eyebrow"><span className="signal warm" /> Give a pet</div>
        <h1>A new home,<br /><em>chosen by you.</em></h1>
        <p className="auth-lede">A good photo and an honest story help the right family find them. Only you read the requests, and nothing is decided without you.</p>
        <GiveForm userId={profile.id} />
      </section>
      <SiteFooter />
    </main>
  )
}
