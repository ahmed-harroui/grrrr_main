'use client'

import { ArrowUpRight } from 'lucide-react'

export function NewsletterForm() {
  return <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}><label htmlFor="email">Your email address</label><div className="input-row"><input id="email" type="email" placeholder="you@example.com" aria-label="Email address" /><button type="submit" aria-label="Subscribe"><ArrowUpRight size={19} /></button></div><small>No noise. Just useful, occasionally lovely things.</small></form>
}
