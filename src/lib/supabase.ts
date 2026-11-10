import { createClient } from '@supabase/supabase-js'

const url: string = import.meta.env.VITE_SUPABASE_URL ?? ''
const key: string = import.meta.env.VITE_SUPABASE_KEY ?? ''

/** null when the keys are missing: Billio then runs on this device only. */
export const supabase = url && key ? createClient(url, key) : null
