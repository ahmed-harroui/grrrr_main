import { NextStudio } from 'next-sanity/studio'
import { sanityConfigured } from '@/lib/sanity/env'
import config from '../../../sanity.config'

export const dynamic = 'force-static'
export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  if (!sanityConfigured) {
    return <main className="guide container"><h1>Studio not configured</h1><p>Set NEXT_PUBLIC_SANITY_PROJECT_ID (and NEXT_PUBLIC_SANITY_DATASET) in .env.local, then restart the server.</p></main>
  }
  return <NextStudio config={config} />
}
