import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfigured, supabaseKey, supabaseUrl } from './lib/supabase/env'

/**
 * 1. Password-protects the Studio and its AI/sharing endpoints (they spend API credit and post publicly).
 *    Set STUDIO_USER and STUDIO_PASSWORD; without them the Studio is locked outside local dev.
 * 2. Keeps visitors' Supabase sessions fresh on every other page.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/studio') || pathname.startsWith('/api/studio')) return studioAuth(request)
  return refreshSession(request)
}

function studioAuth(request: NextRequest) {
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

async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!supabaseConfigured) return response
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })
  await supabase.auth.getClaims()
  return response
}

export const config = {
  // Everything except static files and images.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
