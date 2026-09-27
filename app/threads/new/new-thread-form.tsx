'use client'

import { useActionState, useState, useTransition } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { ANIMALS, LIMITS, THREAD_CATEGORIES } from '@/lib/community/limits'
import { createThread, suggestFactThread } from '../actions'

export function NewThreadForm({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState(createThread, undefined)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('fact')
  const [animal, setAnimal] = useState('all')
  const [topic, setTopic] = useState('')
  const [aiError, setAiError] = useState('')
  const [suggesting, startSuggest] = useTransition()

  function suggest() {
    setAiError('')
    startSuggest(async () => {
      const res = await suggestFactThread(topic)
      if (res.error || !res.thread) return setAiError(res.error ?? 'No suggestion.')
      setTitle(res.thread.title); setBody(res.thread.body); setCategory(res.thread.category); setAnimal(res.thread.animal)
    })
  }

  return (
    <form action={action} className="thread-form">
      {isAdmin && (
        <div className="ai-helper">
          <div className="ai-helper-row">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Theme for the AI (optional) — e.g. dogs in ancient Egypt" />
            <button type="button" className="button button-light" onClick={suggest} disabled={suggesting}><Sparkles size={15} /> {suggesting ? 'Writing…' : 'Suggest with AI'}</button>
          </div>
          <small>Admin only. Review and check the facts before posting.</small>
          {aiError && <p className="form-error">{aiError}</p>}
        </div>
      )}

      <label htmlFor="title">Title</label>
      <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} required placeholder="The dogs who guarded Pompeii" />
      <small className="counter">{title.length}/{LIMITS.title}</small>

      <label htmlFor="body">Your thread</label>
      <textarea id="body" name="body" rows={9} value={body} onChange={(e) => setBody(e.target.value)} maxLength={LIMITS.body} required placeholder="Leave a blank line between paragraphs." />
      <small className="counter">{body.length}/{LIMITS.body}</small>

      <div className="thread-form-row">
        <div>
          <label htmlFor="category">Category</label>
          <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(THREAD_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="animal">About</label>
          <select id="animal" name="animal" value={animal} onChange={(e) => setAnimal(e.target.value)}>
            {Object.entries(ANIMALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>

      {isAdmin && <label className="checkbox"><input type="checkbox" name="official" defaultChecked /> Post as Grr (official badge)</label>}

      {state?.error && <p className="form-error">{state.error}</p>}
      <button type="submit" className="button button-dark" disabled={pending}>{pending ? 'Posting…' : 'Post thread'} <ArrowUpRight size={16} /></button>
    </form>
  )
}
