'use client'

import { useActionState } from 'react'
import { updateProfile } from '../threads/actions'

export function AccountForm({ username, displayName }: { username: string; displayName: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined)
  return (
    <form action={action} className="thread-form account-form">
      <label htmlFor="username">Username</label>
      <input id="username" name="username" defaultValue={username} required pattern="[a-z0-9_]{3,24}" title="3–24 characters: lowercase letters, numbers or _" />
      <label htmlFor="display_name">Display name (optional)</label>
      <input id="display_name" name="display_name" defaultValue={displayName} maxLength={40} />
      {state?.error && <p className="form-error">{state.error}</p>}
      {state && !state.error && !pending && <p className="form-success">Saved.</p>}
      <button type="submit" className="button button-dark" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
