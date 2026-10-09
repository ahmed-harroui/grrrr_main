import type { MetadataRoute } from 'next'

// Search engines may read the public pages; the account, the forms behind sign-in and the Studio are no use to them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/account', '/login', '/studio', '/api/', '/auth/', '/adopt/mine', '/adopt/give/new', '/threads/new'] },
    sitemap: 'https://www.greatrascals.com/sitemap.xml',
  }
}
