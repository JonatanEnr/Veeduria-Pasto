import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Si no hay variables de entorno, la app cae a modo local (localStorage).
export const supabase = url && clave ? createClient(url, clave) : null

export const BUCKET_FOTOS = 'evidencias'
