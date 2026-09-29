import { z } from 'zod'

export const CATEGORIES = ['BEHAVIOUR', 'PUPPY LIFE', 'WELLBEING', 'HEALTH', 'NUTRITION', 'TRAINING', 'CATS'] as const

/** A paragraph-level block as Claude reads and writes it. `text` may use **bold** and *italic*. */
export const AiBlockSchema = z.object({
  style: z.enum(['normal', 'h2', 'h3', 'blockquote', 'bullet', 'number']),
  text: z.string(),
})
export type AiBlock = z.infer<typeof AiBlockSchema>

export const GeneratedGuideSchema = z.object({
  title: z.string(),
  category: z.enum(CATEGORIES),
  excerpt: z.string().describe('One or two sentences shown on cards and as the meta description'),
  readMinutes: z.number().int(),
  body: z.array(AiBlockSchema).describe('The guide body: 4–6 h2 sections, each followed by normal paragraphs (bullets only where they genuinely help)'),
  vetNote: z.string().describe('When to see a vet; empty string if not relevant'),
  thread: z.array(z.string()).describe('Paragraphs of the community thread, in order; first one is the hook'),
})
export type GeneratedGuide = z.infer<typeof GeneratedGuideSchema>

export const RewriteSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  body: z.array(AiBlockSchema),
})
export type Rewrite = z.infer<typeof RewriteSchema>

export const CritiqueSchema = z.object({
  score: z.number().int().describe('Overall quality out of 10'),
  summary: z.string().describe('One or two sentences, in French'),
  tips: z.array(z.object({ issue: z.string(), suggestion: z.string() })).describe('3–6 concrete, specific tips, in French, quoting the passage concerned'),
})
export type Critique = z.infer<typeof CritiqueSchema>

export const ThreadSchema = z.object({ thread: z.array(z.string()) })

export const QuestionIdeasSchema = z.object({ questions: z.array(z.string()) })

export const FactThreadSchema = z.object({
  title: z.string().describe('Short, intriguing title, max 100 characters'),
  body: z.string().describe('The thread text, 400–1200 characters, short paragraphs separated by blank lines'),
  category: z.enum(['fact', 'history', 'culture', 'science', 'story', 'tip']),
  animal: z.enum(['dog', 'cat', 'all']),
})

/** Guide as stored in Sanity. */
export type ThreadPost = { _key: string; text: string }
export type Guide = {
  _id: string
  title: string
  slug: string
  category: string
  question?: string
  excerpt: string
  readMinutes: number
  body: PortableBlock[]
  vetNote?: string
  thread?: ThreadPost[]
  threadPostedAt?: string
  _createdAt: string
}

export type PortableSpan = { _type: 'span'; _key: string; text: string; marks: string[] }
export type PortableBlock = {
  _type: 'block'
  _key: string
  style: string
  listItem?: 'bullet' | 'number'
  level?: number
  markDefs: unknown[]
  children: PortableSpan[]
}
