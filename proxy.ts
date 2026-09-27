import { NextResponse, type NextRequest } from 'next/server'

/**
 * Password-protects the Studio and its AI/Threads endpoints (they spend API credit and post publicly).
 * Set STUDIO_USER and STUDIO_PASSWORD; without them the Studio is locked outside local dev.
 */
export function proxy(request: NextRequest) {
  const user = process.env.STUDIO_USER
  const password = process.env.STUDIO_PASSWORD
  if (!user || !password) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next()
    return new NextResponse('Studio disabled: set STUDIO_USER and STUDIO_PASSWORD.', { status: 503 })
  }

  const header = request.headers.get('authorization') ?? ''
  const [scheme, encoded] = header.split(' ')
  if (scheme === 'Basic' && encoded) {
    const [u, ...rest] = atob(encoded).split(':')
    if (u === user && rest.join(':') === password) return NextResponse.next()
  }
  return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Grr Studio", charset="UTF-8"' } })
}

export const config = { matcher: ['/studio/:path*', '/api/studio/:path*'] }
