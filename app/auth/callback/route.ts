import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Magic links, sign-up confirmations and Google land here. Two link formats:
 * ?code=… (must be opened in the browser that asked for it) or ?token_hash=…&type=… (works in any browser).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/threads'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/threads'

  const supabase = await createClient()
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error(searchParams.get('error_description') ?? 'missing code') }
  if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  console.error('auth callback:', error.message)
  return NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(safeNext)}`)
}
