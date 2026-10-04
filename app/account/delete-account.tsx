'use client'

import { useActionState, useState } from 'react'
import { deleteAccount } from '../threads/actions'

/** Asked for by the GDPR and the app stores: the member deletes their own account, for good. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(deleteAccount, undefined)

  if (!open) {
    return (
      <div className="danger-zone">
        <button type="button" className="link-danger" onClick={() => setOpen(true)}>Delete my account</button>
      </div>
    )
  }

  return (
    <form action={action} className="thread-form danger-zone is-open">
      <h2>Delete your account?</h2>
      <p>
        This removes your account for good, on this site and in the GRRRR and Grr Care apps: your pets, matches, messages, health records, threads, comments and listings. It cannot be undone.
      </p>
      <label htmlFor="confirm">Type DELETE to confirm</label>
      <input id="confirm" name="confirm" autoComplete="off" required />
      {state?.error && <p className="form-error">{state.error}</p>}
      <div className="danger-actions">
        <button type="submit" className="button button-danger" disabled={pending}>{pending ? 'Deleting…' : 'Delete for good'}</button>
        <button type="button" className="link-muted" onClick={() => setOpen(false)}>Keep my account</button>
      </div>
    </form>
  )
}
