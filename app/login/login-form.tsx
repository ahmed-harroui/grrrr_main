'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'link'

/** Supabase's English errors, in words a visitor understands. */
function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Wrong e-mail or password. New here? Choose “Create an account”.'
  if (/already registered|already exists/i.test(message)) return 'This e-mail already has an account (maybe from the Grr Care app): sign in with its password.'
  if (/rate limit/i.test(message)) return 'Too many e-mails sent for now. Wait a few minutes, or sign in with a password.'
  if (/password/i.test(message) && /characters|short|weak/i.test(message)) return 'Choose a longer password (at least 8 characters).'
  if (/email not confirmed/i.test(message)) return 'Confirm your e-mail first, or ask for a sign-in link below.'
  return message
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState('')
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

  function signedIn() {
    router.replace(next)
    router.refresh()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setState('busy'); setError('')
    const auth = createClient().auth
    if (mode === 'link') {
      const { error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
      if (error) { setError(friendly(error.message)); setState('idle') } else setState('sent')
      return
    }
    if (mode === 'signin') {
      const { error } = await auth.signInWithPassword({ email, password })
      if (error) { setError(friendly(error.message)); setState('idle') } else signedIn()
      return
    }
    const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } })
    if (error) { setError(friendly(error.message)); setState('idle') }
    else if (data.session) signedIn() // no e-mail confirmation required: signed in straight away
    else setState('sent')
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
    if (error) setError(friendly(error.message))
  }

  if (state === 'sent') {
    return (
      <div className="auth-sent">
        <Mail size={28} />
        <h2>Check your inbox</h2>
        <p>We sent a link to <strong>{email}</strong>. Open it <strong>in this same browser</strong> to continue. Nothing after a few minutes? Look in your spam folder.</p>
        <button className="text-link" type="button" onClick={() => { setState('idle'); setMode('signin') }}>Sign in with a password instead</button>
      </div>
    )
  }

  const busy = state === 'busy'
  return (
    <div className="auth-form">
      {/* Google: the same Google sign-in as the GRRRR and Grr Care apps (Supabase provider "google") */}
      <button className="auth-google-button" type="button" onClick={google}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </button>
      <div className="auth-divider"><span>or with your e-mail</span></div>
      <div className="thread-tabs auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError('') }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError('') }}>Create an account</button>
      </div>
      <form onSubmit={submit} className="auth-fields">
        <label htmlFor="login-email">Your e-mail</label>
        <input id="login-email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'link' && (
          <>
            <label htmlFor="login-password">{mode === 'signup' ? 'Choose a password' : 'Password'}</label>
            <input id="login-password" type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        <button className="button button-dark" type="submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create my account' : 'E-mail me a sign-in link'} <ArrowUpRight size={16} />
        </button>
        <small>
          {mode === 'signin' && 'Already use the Grr Care app? It’s the same account and password.'}
          {mode === 'signup' && 'One account for the whole Grr family, the Care app included.'}
          {mode === 'link' && 'No password needed: we e-mail you a link.'}
        </small>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="auth-divider"><span>or</span></div>
      {mode === 'link'
        ? <button className="text-link" type="button" onClick={() => setMode('signin')}>Sign in with a password</button>
        : <button className="text-link" type="button" onClick={() => { setMode('link'); setError('') }}>Forgot your password? Get a sign-in link by e-mail</button>}
    </div>
  )
}
