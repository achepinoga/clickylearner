import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in client/.env — auth and database features are disabled.')
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key'
)

export const isSupabaseConfigured = Boolean(url && key)
