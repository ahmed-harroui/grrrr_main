'use client'

import { useActionState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { requestListing, type FormState } from '../../actions'

export function RequestForm({ listingId, petName }: { listingId: string; petName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestListing.bind(null, listingId), undefined)

  if (state?.ok) {
    return (
      <div className="litter-sent">
        <Check size={16} />
        <span>Request sent. {petName}’s owner reads it and contacts you if it’s a good match.</span>
      </div>
    )
  }

  return (
    <form action={action} className="thread-form give-request">
      <label htmlFor="message">About you and your home</label>
      <textarea id="message" name="message" rows={5} maxLength={800} required placeholder={`Why you’d love to welcome ${petName}: your home, garden, other pets, daily routine…`} />
      <label htmlFor="contact">How can the owner reach you?</label>
      <input id="contact" name="contact" maxLength={120} required placeholder="Phone number or e-mail" />
      <small className="counter">Only the owner sees your message and contact.</small>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="button button-dark" type="submit" disabled={pending}>{pending ? 'Sending…' : `Ask to adopt ${petName}`} <ArrowUpRight size={16} /></button>
    </form>
  )
}
