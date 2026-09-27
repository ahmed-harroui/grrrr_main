export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const apiVersion = '2026-09-01'

/** False until the Sanity project is configured — the site then falls back to its placeholder content. */
export const sanityConfigured = projectId.length > 0
