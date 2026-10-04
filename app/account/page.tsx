import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getCurrentProfile } from '@/lib/supabase/server'
import Link from 'next/link'
import { AccountForm } from './account-form'
import { DeleteAccount } from './delete-account'

export const dynamic = 'force-dynamic' // depends on who is signed in
export const metadata: Metadata = { title: 'Your account — Grr' }

export default async function AccountPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login?next=/account')
  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="auth container">
        <div className="eyebrow"><span className="eyebrow-line" /> Your account</div>
        <h1>Hello,<br /><em>{profile.display_name || `@${profile.username}`}.</em></h1>
        {profile.role === 'admin' && <p className="auth-lede">You’re an admin: you can post official threads, use AI suggestions and delete any thread or comment.</p>}
        <AccountForm username={profile.username} displayName={profile.display_name ?? ''} />
        <p className="account-links"><Link className="text-link" href="/adopt/mine">My pets to give</Link><Link className="text-link" href="/privacy">Privacy</Link><Link className="text-link" href="/terms">Terms</Link></p>
        <DeleteAccount />
      </section>
      <SiteFooter />
    </main>
  )
}
