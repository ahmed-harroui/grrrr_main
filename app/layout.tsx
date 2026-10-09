import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Motion } from '@/components/motion'

const SITE_URL = 'https://www.greatrascals.com'
const TITLE = 'Grr — Better days together.'
const DESCRIPTION = 'Grr is a living ecosystem for the people and animals who make life feel more like life.'

export const metadata: Metadata = {
  // Makes the image addresses below absolute, as search engines and share previews need them
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // The paw of the logo. Google shows a site's icon next to its results and asks for a square
  // whose side is a multiple of 48 px; /favicon.ico holds the same picture.
  icons: {
    icon: [
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  // The full logo, shown when a page of the site is shared
  openGraph: {
    type: 'website',
    siteName: 'Grr',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'GRRRR' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og-image.png'] },
}

// Tells search engines who publishes the site and which picture is its logo
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GRRRR',
  alternateName: ['Grr', 'Great Rascals'],
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }} />
        <Motion />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
