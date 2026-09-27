import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId } from './env'

/** Public, published-only reads for the website. */
export const readClient = createClient({ projectId: projectId || 'missing', dataset, apiVersion, useCdn: false, perspective: 'published' })

/** Server-side reads/writes (script + API routes). Needs SANITY_API_WRITE_TOKEN (Editor role). */
export function writeClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!projectId) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID (set it in .env.local).')
  if (!token) throw new Error('Missing SANITY_API_WRITE_TOKEN (set it in .env.local).')
  return createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' })
}
