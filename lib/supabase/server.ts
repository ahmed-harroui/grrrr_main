import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { adminConfigured, createAdminClient } from './admin'
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
  const { data: profile } = await supabase.from('grr_members').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  return profile ?? createMissingMember(userId, typeof data?.claims?.email === 'string' ? data.claims.email : '')
}

const PROFILE_COLUMNS = 'id, username, display_name, avatar_url, role'

/**
 * Accounts created before the community existed (e.g. in the GRRR Care app, which shares this Supabase project)
 * have no grr_members row: the sign-up trigger never ran for them. Create it on their first visit.
 */
async function createMissingMember(userId: string, email: string): Promise<Profile | null> {
  if (!adminConfigured()) return null
  const admin = createAdminClient()
  const base = (email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member').slice(0, 18).padEnd(3, '_')
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt ? `${base}${Math.floor(Math.random() * 10000)}` : base
    const { data, error } = await admin.from('grr_members').insert({ id: userId, username }).select(PROFILE_COLUMNS).single()
    if (!error) return data as Profile
    if (error.code !== '23505') break // not a username clash
    const { data: existing } = await admin.from('grr_members').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
    if (existing) return existing as Profile // created meanwhile (two tabs)
  }
  return null
}
