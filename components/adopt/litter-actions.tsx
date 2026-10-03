'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Baby, Check, HandCoins } from 'lucide-react'
import { requestLitter } from '@/app/adopt/actions'

/** Adopt or buy one of the babies; signed-out visitors are sent to sign in first. */
export function LitterActions({ litterId, signedIn, parents }: { litterId: string; signedIn: boolean; parents: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ intent: 'ADOPT' | 'BUY'; ok?: boolean; already?: boolean; error?: string } | null>(null)

  if (!signedIn) {
    return (
      <div className="litter-actions">
        <Link className="button button-adopt" href="/login?next=/adopt"><Baby size={16} /> Adopt</Link>
        <Link className="button button-buy" href="/login?next=/adopt"><HandCoins size={16} /> Buy</Link>
      </div>
    )
  }

  if (result?.ok || result?.already) {
    return (
      <div className="litter-sent">
        <Check size={16} />
        <span>
          {result.already
            ? 'You already asked for this litter.'
            : `Request sent to ${parents}. They answer you in the GRRRR app, in Messages.`}
        </span>
      </div>
    )
  }

  const ask = (intent: 'ADOPT' | 'BUY') =>
    startTransition(async () => {
      const response = await requestLitter(litterId, intent)
      setResult({ intent, ...response })
    })

  return (
    <>
      <div className="litter-actions">
        <button type="button" className="button button-adopt" disabled={pending} onClick={() => ask('ADOPT')}><Baby size={16} /> {pending && result?.intent !== 'BUY' ? 'Sending…' : 'Adopt'}</button>
        <button type="button" className="button button-buy" disabled={pending} onClick={() => ask('BUY')}><HandCoins size={16} /> Buy</button>
      </div>
      {result?.error && <p className="form-error">{result.error}</p>}
    </>
  )
}
