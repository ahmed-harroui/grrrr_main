import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'
import { REWRITE_MODES, type RewriteMode } from './modes'
import { CATEGORIES, CritiqueSchema, FactThreadSchema, GeneratedGuideSchema, QuestionIdeasSchema, RewriteSchema, ThreadSchema, type AiBlock } from './schema'

const MODEL = 'claude-opus-5'

export const BRAND_VOICE = `You write for Grr, a warm, modern pet-life brand ("Better days together"). Its journal turns real questions from pet owners into genuinely useful guides.

Voice: calm, knowledgeable, kind, a little playful — never clickbait, never preachy. British spelling. Short paragraphs, varied sentence rhythm, concrete images over abstractions. Practical advice a reader can act on today. Be accurate: where evidence is mixed, say so; never invent statistics, studies or quotes. Health topics must tell the reader when to see a vet.

Body format: a list of blocks. Styles: "h2" section heading, "h3" sub-heading, "normal" paragraph, "blockquote" for one memorable line, "bullet"/"number" for list items. Inline **bold** and *italic* are allowed sparingly. No markdown headings, no bullet characters inside text.`

const THREAD_RULES = `A Threads thread of 3–6 posts that stands on its own: post 1 is a curiosity hook, the middle posts each deliver one useful takeaway, the last post invites people to read the full guide (the link is appended automatically, so never write a URL). Each post under 450 characters. At most one emoji per post, 0–1 hashtags in the whole thread.`

export class AiDeclinedError extends Error {}

let client: Anthropic | undefined
function anthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY (set it in .env.local).')
  return (client ??= new Anthropic({ apiKey }))
}

async function ask<S extends z.ZodType>(schema: S, prompt: string, effort: 'medium' | 'high' = 'high'): Promise<z.infer<S>> {
  const response = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: BRAND_VOICE,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort, format: betaZodOutputFormat(schema) },
  })
  if (response.stop_reason === 'refusal') throw new AiDeclinedError(`Claude declined (${response.stop_details?.category ?? 'unknown'}).`)
  if (response.stop_reason === 'max_tokens' || response.parsed_output == null) throw new Error(`Incomplete AI output (stop_reason=${response.stop_reason}).`)
  return response.parsed_output as z.infer<S>
}

/** vetNote is context only: it is shown in its own box after the body, and rewrites don't change it. */
type Draft = { title: string; excerpt: string; body: AiBlock[]; vetNote?: string }
const asJson = (draft: Draft) => JSON.stringify(draft, null, 2)

export function generateGuide(question: string, existingTitles: string[]) {
  return ask(
    GeneratedGuideSchema,
    `Question from a pet owner: "${question}"

Write a guide of roughly 700–1100 words, plus ${THREAD_RULES}

Existing guide titles (don't duplicate their angle):
${existingTitles.map((t) => `- ${t}`).join('\n') || '(none yet)'}`,
  )
}

export function rewriteGuide(draft: Draft, mode: RewriteMode, customInstruction?: string) {
  const instruction = mode === 'custom' ? customInstruction?.trim() : REWRITE_MODES[mode].instruction
  if (!instruction) throw new Error('Missing instruction.')
  return ask(RewriteSchema, `Here is a draft guide as JSON:\n\n${asJson(draft)}\n\nTask: ${instruction}\n\nReturn the full guide (title, excerpt, body).`)
}

export function critiqueGuide(draft: Draft) {
  return ask(
    CritiqueSchema,
    `Here is a draft guide as JSON:\n\n${asJson(draft)}\n\nAct as a demanding editor. Judge it against the Grr voice, clarity, accuracy, usefulness and how interesting it is to read. Give a score out of 10 and specific tips (written in French for the editor, quoting the English passage each tip is about).`,
    'medium',
  )
}

/** A short community thread: a historical, cultural or scientific fact about pets (admins only). */
export function generateFactThread(topic: string, recentTitles: string[]) {
  return ask(
    FactThreadSchema,
    `Write a short thread for the Grr community feed: a genuinely surprising, well-established fact, piece of history or cultural story about dogs or cats${topic.trim() ? `, on this theme: "${topic.trim()}"` : ' (pick the theme yourself)'}.

It must be true and widely documented — if you are not confident about a detail (a date, a number, a name), leave it out rather than guess. Tell it like a story: a hook in the first line, then the context, then why it still matters to pet owners today. Plain text, no markdown, no hashtags, at most one emoji.

Recent threads (pick a different subject):
${recentTitles.map((t) => `- ${t}`).join('\n') || '(none yet)'}`,
    'medium',
  )
}

/** Ideas for the question queue, when it runs empty. */
export async function suggestQuestions(count: number, covered: string[]) {
  const { questions } = await ask(
    QuestionIdeasSchema,
    `Suggest ${count} new questions that real dog and cat owners genuinely ask (the kind typed into Google or asked at the vet), each worth a full practical guide. Phrase each as the owner would ask it, in English, first person ("my dog…", "my cat…"). Mix dogs and cats, seasons, life stages and these topics: ${CATEGORIES.join(', ')}.

Do not repeat or closely overlap anything already covered:
${covered.map((t) => `- ${t}`).join('\n') || '(nothing yet)'}`,
    'medium',
  )
  return questions.slice(0, count)
}

export async function generateThread(draft: Draft) {
  const { thread } = await ask(ThreadSchema, `Here is a published guide as JSON:\n\n${asJson(draft)}\n\nWrite ${THREAD_RULES}`, 'medium')
  return thread
}
