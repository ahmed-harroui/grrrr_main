import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { supabaseConfigured } from '@/lib/supabase/env'
import { getCurrentProfile } from '@/lib/supabase/server'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic' // depends on who is signed in
export const metadata: Metadata = { title: 'Sign in — Grr' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = '/threads', error } = await searchParams
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/threads'
  if (await getCurrentProfile()) redirect(safeNext)

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="auth container">
        <div className="eyebrow"><span className="eyebrow-line" /> Join the Grr community</div>
        <h1>Share what you<br /><em>know and love.</em></h1>
        <p className="auth-lede">Sign in to post threads, upvote the ones you enjoy and join the conversation.</p>
        {error && <p className="form-error">That link didn’t work: it has expired, or was opened in another browser. Sign in with your password, or ask for a new link.</p>}
        {supabaseConfigured ? <LoginForm next={safeNext} /> : <p className="form-error">Sign-in isn’t configured yet.</p>}
      </section>
      <SiteFooter />
    </main>
  )
}
