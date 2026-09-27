import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfigured, supabaseKey, supabaseUrl } from './env'

/** Supabase client for Server Components, Server Actions and Route Handlers (acts as the signed-in visitor). */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  })
}

export type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null; role: 'member' | 'admin' }

/** The signed-in visitor's profile, or null. Never wrap it in try/catch: reading cookies must be allowed to mark the page as dynamic. */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!supabaseConfigured) return null
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null
  const { data: profile } = await supabase.from('grr_members').select('id, username, display_name, avatar_url, role').eq('id', userId).single()
  return profile
}
