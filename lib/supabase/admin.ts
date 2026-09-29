import { createClient } from '@supabase/supabase-js'
import { supabaseUrl } from './env'

/** False until the server can write to Supabase (sharing guides, the assistant's knowledge). */
export const adminConfigured = () => Boolean(supabaseUrl && process.env.SUPABASE_SECRET_KEY)

/** Server-only client with full access (bypasses row-level security). Never import from client components. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY (Supabase → Project Settings → API Keys → Secret key).')
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
