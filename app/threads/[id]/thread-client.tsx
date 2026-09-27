'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { ArrowUpRight, Flag } from 'lucide-react'
import { addComment, reportThread } from '../actions'
import { LIMITS } from '@/lib/community/limits'

export function CommentForm({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState(addComment.bind(null, threadId), undefined)
  const [body, setBody] = useState('')
  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) setBody('')
    wasPending.current = pending
  }, [pending, state])

  return (
    <form action={action} className="comment-form">
      <textarea name="body" rows={3} maxLength={LIMITS.comment} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} required />
      <div className="comment-form-row">
        <small>{body.length}/{LIMITS.comment}</small>
        <button type="submit" className="button button-dark" disabled={pending || !body.trim()}>{pending ? 'Posting…' : 'Comment'} <ArrowUpRight size={15} /></button>
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
    </form>
  )
}

export function ReportButton({ threadId }: { threadId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  if (message) return <span className="report-done">{message}</span>
  if (!open) return <button type="button" className="link-muted" onClick={() => setOpen(true)}><Flag size={13} /> Report</button>
  return (
    <div className="report-box">
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="What’s wrong with this thread?" />
      <button type="button" className="link-danger" disabled={pending} onClick={() => startTransition(async () => {
        const res = await reportThread(threadId, reason)
        setMessage(res?.error ?? 'Thanks — our team will take a look.')
      })}>Send</button>
      <button type="button" className="link-muted" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  )
}
