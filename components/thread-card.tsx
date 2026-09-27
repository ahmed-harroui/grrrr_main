import Link from 'next/link'
import { BadgeCheck, MessageCircle } from 'lucide-react'
import { ANIMALS, THREAD_CATEGORIES, timeAgo, type Thread } from '@/lib/community/threads'
import { LikeButton } from './like-button'

export function ThreadCard({ thread, signedIn, full = false }: { thread: Thread; signedIn: boolean; full?: boolean }) {
  const preview = !full && thread.body.length > 280 ? `${thread.body.slice(0, 280).trimEnd()}…` : thread.body
  return (
    <article className={`thread-card${thread.is_official ? ' official' : ''}`}>
      <div className="thread-meta">
        <span className="thread-category">{THREAD_CATEGORIES[thread.category]}</span>
        {thread.animal !== 'all' && <span className="thread-animal">{ANIMALS[thread.animal]}</span>}
        {thread.is_official && <span className="thread-official"><BadgeCheck size={13} /> Grr</span>}
      </div>
      {full ? <h1>{thread.title}</h1> : <h3><Link href={`/threads/${thread.id}`}>{thread.title}</Link></h3>}
      <div className="thread-body">{preview.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
      <div className="thread-footer">
        <span className="thread-author">@{thread.author?.username ?? 'someone'} · {timeAgo(thread.created_at)}</span>
        <div className="thread-actions">
          <LikeButton threadId={thread.id} liked={thread.liked} count={thread.like_count} signedIn={signedIn} />
          {!full && <Link href={`/threads/${thread.id}`} className="thread-comments"><MessageCircle size={16} /> {thread.comment_count}</Link>}
        </div>
      </div>
    </article>
  )
}
