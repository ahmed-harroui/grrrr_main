import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Magic links and Google both land here with a one-time code that becomes the session cookie. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/threads'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/threads'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }
  return NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(safeNext)}`)
}
