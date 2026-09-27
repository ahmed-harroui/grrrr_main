'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/app/threads/actions'

export function LikeButton({ threadId, liked, count, signedIn }: { threadId: string; liked: boolean; count: number; signedIn: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useOptimistic({ liked, count }, (_, next: { liked: boolean; count: number }) => next)

  function onClick() {
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(`/threads/${threadId}`)}`)
    const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) }
    startTransition(async () => {
      setState(next)
      await toggleLike(threadId, next.liked)
    })
  }

  return (
    <button type="button" className={`like-button${state.liked ? ' liked' : ''}`} onClick={onClick} disabled={pending} aria-pressed={state.liked} aria-label={state.liked ? 'Unlike' : 'Like'}>
      <Heart size={16} fill={state.liked ? 'currentColor' : 'none'} /> {state.count}
    </button>
  )
}
