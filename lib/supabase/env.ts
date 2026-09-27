// Accept the REST URL too ("https://x.supabase.co/rest/v1/") — the client needs the bare project URL.
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

/** False until Supabase is configured — the community pages then show a friendly notice. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)
