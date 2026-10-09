import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.greatrascals.com'

// The public sections of the site. Single guides and threads are found from their listing pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; changeFrequency: 'daily' | 'weekly' | 'yearly'; priority: number }[] = [
    { path: '', changeFrequency: 'weekly', priority: 1 },
    { path: '/guides', changeFrequency: 'daily', priority: 0.8 },
    { path: '/threads', changeFrequency: 'daily', priority: 0.8 },
    { path: '/adopt', changeFrequency: 'daily', priority: 0.8 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  ]
  return pages.map(({ path, changeFrequency, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency, priority }))
}
