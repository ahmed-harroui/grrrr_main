'use client'

import { useState } from 'react'
import { ArrowUpRight, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

  async function sendLink(event: React.FormEvent) {
    event.preventDefault()
    setState('sending')
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
    if (error) { setError(error.message); setState('error') } else setState('sent')
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
    if (error) { setError(error.message); setState('error') }
  }

  if (state === 'sent') {
    return (
      <div className="auth-sent">
        <Mail size={28} />
        <h2>Check your inbox</h2>
        <p>We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.</p>
        <button className="text-link" type="button" onClick={() => setState('idle')}>Use another e-mail</button>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <form onSubmit={sendLink}>
        <label htmlFor="login-email">Your e-mail</label>
        <div className="input-row">
          <input id="login-email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" aria-label="Send sign-in link" disabled={state === 'sending'}><ArrowUpRight size={19} /></button>
        </div>
        <small>{state === 'sending' ? 'Sending…' : 'No password needed — we e-mail you a magic link.'}</small>
      </form>
      {process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true' && (
        <>
          <div className="auth-divider"><span>or</span></div>
          <button className="button button-dark auth-google" type="button" onClick={google}>Continue with Google</button>
        </>
      )}
      {state === 'error' && <p className="form-error">{error}</p>}
    </div>
  )
}
