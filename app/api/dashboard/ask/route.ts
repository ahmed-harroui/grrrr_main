import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/supabase/server'

// The dashboard's data analyst: an admin asks a question in plain words, Claude answers it by
// querying the analytics views (Care migration 028: no personal data, read only, rolled back)
// and explains what the numbers say and what to do about them.

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // a few queries and a careful answer can take a minute or two

const MODEL = 'claude-opus-5-5'
const MAX_STEPS = 10 // queries run for one question, at most

type Turn = { question: string; answer: string }
type Query = { sql: string; purpose: string; rows?: Record<string, unknown>[]; count?: number; error?: string }

const RUN_SQL: Anthropic.Beta.BetaTool = {
  name: 'run_sql',
  description:
    'Run one read-only PostgreSQL SELECT (or WITH … SELECT) on the analytics views listed in the system prompt, and get its rows back as JSON (500 rows at most). Use the view names without a schema. Aggregate in SQL (count, sum, date_trunc, percentiles) rather than fetching raw rows. If the query fails, the error comes back: fix it and try again.',
  input_schema: {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'The SELECT query, without a trailing semicolon.' },
      purpose: { type: 'string', description: 'What this query is for, in a few French words, shown to the admin next to the result.' },
    },
    required: ['sql', 'purpose'],
    additionalProperties: false,
  },
  strict: true,
}

function systemPrompt(schema: { view: string; note: string | null; columns: string }[]) {
  const views = schema.map((v) => `- ${v.view}(${v.columns})${v.note ? ` — ${v.note}` : ''}`).join('\n')
  return `You are the data analyst of the GRRR ecosystem, working for its founder. You answer his questions about how people use the products, in French, the way a senior product analyst would: precise numbers, what they mean, and what to do next.

The products (one shared database and one account per person):
- GRRRR: a social app for pets. Pets like each other (likes), match, send messages, propose outings on a map; adoption and rehoming; XP levels, croquettes (treats) earned for matches, outings and daily gifts.
- GRRR Care: a health app for pets. Health record (vaccinations, medications, vet visits, documents), a care plan with a "magic wand" that plans the next dates, reminders, an AI assistant (daily limit 30 questions), a weekly game.
- The store (store.greatrascals.com): products paid in croquettes; croquettes can be bought (10 € = 40 croquettes).
- Partners: vets, pet shops and groomers on the maps (France and Morocco), invited by email to become partners and list products.
- The community site greatrascals.com: discussion threads.

You can read these PostgreSQL views (and nothing else) with the run_sql tool:
${views}

How to work:
- Leave out the demo profiles: pets.is_demo_profile = true (they are bots); likes, matches and messages that involve them are not real activity.
- Dates are timestamptz; group by day or week in the Europe/Paris time zone when it matters.
- Check what you assume (for example, what a status column contains) with a quick query before building on it.
- The volumes are small (an early product): say so when a number is too small to conclude, and never invent a figure you did not query.
- Answer in French. Start with the answer itself in one or two sentences, then the figures that support it, then what you recommend doing. Keep it short and plain: no jargon, no headings unless the answer is long. Use a short list or a small table (markdown pipes) when it reads better than sentences.`
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins.' }, { status: 403 })
  if (!adminConfigured()) return NextResponse.json({ error: 'Le serveur n’a pas sa clé Supabase (SUPABASE_SECRET_KEY).' }, { status: 500 })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Le serveur n’a pas de clé Anthropic (ANTHROPIC_API_KEY).' }, { status: 500 })

  const body = (await request.json().catch(() => null)) as { question?: string; history?: Turn[] } | null
  const question = body?.question?.trim()
  if (!question || question.length > 2000) return NextResponse.json({ error: 'Pose une question (2 000 caractères au plus).' }, { status: 400 })
  const history = (body?.history ?? []).slice(-6).filter((t) => t?.question && t?.answer)

  const db = createAdminClient()
  const [{ data: schema, error: schemaError }, { data: overview }] = await Promise.all([db.rpc('analyst_schema'), db.rpc('admin_dashboard', { p_days: 30 })])
  if (schemaError || !schema) return NextResponse.json({ error: `Les vues d’analyse sont introuvables : ${schemaError?.message ?? 'vide'}.` }, { status: 500 })

  const client = new Anthropic({ apiKey })
  const today = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  // Earlier questions of the conversation come back as plain text: each request starts afresh
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.flatMap((t): Anthropic.Beta.BetaMessageParam[] => [
      { role: 'user', content: t.question },
      { role: 'assistant', content: t.answer },
    ]),
    {
      role: 'user',
      content: `Nous sommes le ${today}. Pour te situer, voici le résumé du tableau de bord sur 30 jours (JSON) :\n${JSON.stringify(overview ?? {})}\n\nMa question : ${question}`,
    },
  ]

  const queries: Query[] = []
  try {
    for (let step = 0; step <= MAX_STEPS; step++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system: [{ type: 'text', text: systemPrompt(schema), cache_control: { type: 'ephemeral' } }],
        // The last turn of queries: no more tools, the answer now
        tools: step < MAX_STEPS ? [RUN_SQL] : [],
        messages,
      })

      if (response.stop_reason === 'refusal') {
        return NextResponse.json({ answer: 'L’analyste a refusé de répondre à cette question.', queries })
      }
      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        const answer = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
        const cut = response.stop_reason === 'max_tokens' ? '\n\n(Réponse coupée : elle était trop longue.)' : ''
        return NextResponse.json({ answer: (answer || 'Pas de réponse.') + cut, queries })
      }

      messages.push({ role: 'assistant', content: response.content })
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (use) => {
          const input = use.input as { sql?: unknown; purpose?: unknown }
          const sql = typeof input.sql === 'string' ? input.sql : ''
          const purpose = typeof input.purpose === 'string' ? input.purpose : ''
          const { data, error } = await db.rpc('analyst_query', { p_sql: sql })
          const result = (error ? { error: error.message } : data) as { rows?: Record<string, unknown>[]; count?: number; error?: string }
          queries.push({ sql, purpose, rows: result.rows?.slice(0, 50), count: result.count, error: result.error })
          return {
            type: 'tool_result' as const,
            tool_use_id: use.id,
            content: JSON.stringify(result.error ? { error: result.error } : { count: result.count, rows: result.rows }),
            is_error: Boolean(result.error),
          }
        }),
      )
      messages.push({ role: 'user', content: results })
    }
    return NextResponse.json({ answer: 'L’analyste n’a pas fini à temps : reformule la question plus précisément.', queries })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'Trop de questions d’affilée : réessaie dans une minute.' }, { status: 429 })
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: `L’analyste n’a pas pu répondre (${error.status}).` }, { status: 502 })
    throw error
  }
}
