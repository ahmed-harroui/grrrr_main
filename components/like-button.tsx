'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowBigUp } from 'lucide-react'
import { toggleLike } from '@/app/threads/actions'

/** Upvote: the most upvoted threads trend, and become knowledge for the GRRR Care assistant. */
export function LikeButton({ threadId, liked, count, signedIn }: { threadId: string; liked: boolean; count: number; signedIn: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useOptimistic({ liked, count }, (_, next: { liked: boolean; count: number }) => next)
  const [burst, setBurst] = useState(false)

  function onClick() {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(`/threads/${threadId}`)}`)
    const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) }
    if (next.liked) {
      // The same "community signal" spark as in the knowledge loop on the home page
      setBurst(true)
      window.setTimeout(() => setBurst(false), 650)
    }
    startTransition(async () => {
      setState(next)
      await toggleLike(threadId, next.liked)
    })
  }

  return (
    <button type="button" className={`like-button${state.liked ? ' liked' : ''}${burst ? ' burst' : ''}`} onClick={onClick} disabled={pending} aria-pressed={state.liked} aria-label={state.liked ? 'Remove upvote' : 'Upvote'} title={state.liked ? 'Remove upvote' : 'Upvote'}>
      <ArrowBigUp size={18} fill={state.liked ? 'currentColor' : 'none'} /> {state.count}
    </button>
  )
}
