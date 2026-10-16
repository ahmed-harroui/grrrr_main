'use client'

import { useState } from 'react'
import styles from './dashboard.module.css'

// The dashboard's analyst: a question in plain words, an answer from the data (app/api/dashboard/ask).
// The conversation stays on the page; each answer shows the queries it ran and their results.

type Query = { sql: string; purpose: string; rows?: Record<string, unknown>[]; count?: number; error?: string }
type Turn = { question: string; answer: string; queries: Query[] }

const IDEAS = [
  'Où les nouveaux comptes décrochent-ils, et pourquoi ?',
  'Quelles espèces matchent et discutent le plus ?',
  'Combien de croquettes chaque compte a-t-il en moyenne, et qui en a le plus sans les dépenser ?',
  'Comment évoluent les questions à l’assistant de semaine en semaine ?',
  'Les gens qui utilisent GRRR Care reviennent-ils plus souvent que les autres ?',
]

/** **bold**, lists and | tables | of the answer, without a markdown library */
function Answer({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className={styles.answer}>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim())
        if (lines.length >= 2 && lines.every((l) => l.trim().startsWith('|'))) {
          const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
          const rows = lines.filter((l) => !/^\|?\s*:?-{2,}/.test(l.trim())).map(cells)
          return (
            <div key={i} className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>{rows[0].map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
                <tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )
        }
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s/.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s/, ''))}</li>)}</ul>
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l.replace(/^#+\s*/, ''))}</span>)}</p>
      })}
    </div>
  )
}

const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part))

function Result({ query }: { query: Query }) {
  const rows = query.rows ?? []
  const columns = rows[0] ? Object.keys(rows[0]) : []
  return (
    <details className={styles.query}>
      <summary>
        {query.error ? '⚠️' : '🔎'} {query.purpose || 'Requête'} <em>{query.error ? 'erreur, corrigée ensuite' : `${query.count ?? rows.length} ligne${(query.count ?? 0) > 1 ? 's' : ''}`}</em>
      </summary>
      <pre className={styles.sql}>{query.sql}</pre>
      {query.error ? (
        <p className={styles.empty}>{query.error}</p>
      ) : rows.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.slice(0, 20).map((row, i) => <tr key={i}>{columns.map((c) => <td key={c}>{row[c] === null ? '—' : typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>Aucune ligne.</p>
      )}
    </details>
  )
}

export function Analyst() {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setBusy(true)
    setProblem(null)
    try {
      const response = await fetch('/api/dashboard/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history: turns.map(({ question, answer }) => ({ question, answer })) }),
      })
      const data = await response.json().catch(() => ({ error: `Réponse illisible (${response.status}).` }))
      if (!response.ok || data.error) throw new Error(data.error ?? `Erreur ${response.status}`)
      setTurns((all) => [...all, { question: q, answer: data.answer, queries: data.queries ?? [] }])
      setQuestion('')
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.analyst}>
      {turns.map((turn, i) => (
        <article key={i} className={styles.turn}>
          <p className={styles.asked}>{turn.question}</p>
          <Answer text={turn.answer} />
          {turn.queries.length > 0 && (
            <div className={styles.queries}>
              <span className={styles.subhead}>{turn.queries.length} requête{turn.queries.length > 1 ? 's' : ''} sur les données</span>
              {turn.queries.map((query, j) => <Result key={j} query={query} />)}
            </div>
          )}
        </article>
      ))}

      {busy && <p className={styles.thinking}>L’analyste interroge les données… (souvent 30 secondes à 2 minutes)</p>}
      {problem && <p className={styles.problem}>{problem}</p>}

      <form
        className={styles.askForm}
        onSubmit={(event) => {
          event.preventDefault()
          void ask(question)
        }}
      >
        <label htmlFor="analyst-question" className={styles.subhead}>{turns.length ? 'Une autre question, ou une précision' : 'Ta question'}</label>
        <textarea
          id="analyst-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void ask(question)
            }
          }}
          placeholder="Ex. : combien de comptes créés ce mois-ci ont un match, par espèce ?"
          rows={3}
          maxLength={2000}
          disabled={busy}
        />
        <div className={styles.askRow}>
          <button type="submit" disabled={busy || !question.trim()} className={styles.askButton}>{busy ? 'Analyse en cours…' : 'Analyser'}</button>
          {turns.length > 0 && !busy && <button type="button" className={styles.clear} onClick={() => setTurns([])}>Nouvelle conversation</button>}
        </div>
      </form>

      {turns.length === 0 && (
        <div className={styles.ideas}>
          {IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => void ask(idea)} disabled={busy}>{idea}</button>
          ))}
        </div>
      )}
    </div>
  )
}
