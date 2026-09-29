import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ThreadCard } from '@/components/thread-card'
import { getThread, timeAgo } from '@/lib/community/threads'
import { getCurrentProfile } from '@/lib/supabase/server'
import { deleteComment, deleteThread } from '../actions'
import { CommentForm, ReportButton } from './thread-client'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await getThread((await params).id)
  return data ? { title: `${data.thread.title} — Grr`, description: data.thread.body.slice(0, 155) } : {}
}

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, profile] = await Promise.all([getThread(id), getCurrentProfile().catch(() => null)])
  if (!data) notFound()
  const { thread, comments } = data
  const isAdmin = profile?.role === 'admin'
  const canDelete = profile && (profile.id === thread.author_id || isAdmin)

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="thread-page container">
        <Link className="text-link" href="/threads"><ArrowLeft size={16} /> All threads</Link>
        <ThreadCard thread={thread} signedIn={Boolean(profile)} full />
        <div className="thread-tools">
          {profile && profile.id !== thread.author_id && <ReportButton threadId={thread.id} />}
          {canDelete && <form action={deleteThread.bind(null, thread.id)}><button type="submit" className="link-danger">Delete thread</button></form>}
        </div>

        <div className="comments">
          <h2>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</h2>
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment-head">
                <strong>@{c.author?.username ?? 'someone'}</strong> <span>{timeAgo(c.created_at)}</span>
                {profile && (profile.id === c.author_id || isAdmin) && (
                  <form action={deleteComment.bind(null, thread.id, c.id)}><button type="submit" className="link-danger">Delete</button></form>
                )}
              </div>
              <p>{c.body}</p>
            </div>
          ))}
          {profile ? <CommentForm threadId={thread.id} /> : <p className="comment-signin"><Link className="text-link" href={`/login?next=/threads/${thread.id}`}>Sign in to join the conversation</Link></p>}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
