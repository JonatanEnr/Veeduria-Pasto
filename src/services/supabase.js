import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

// Detecta errores típicos al copiar las variables (formato de enlace
// [x](x), comillas, pegar "NOMBRE=valor", pegar todo el .env, etc.)
function validarConfiguracion() {
  if (!url && !clave) return null // modo local intencional
  if (!url) return 'Falta VITE_SUPABASE_URL.'
  if (!clave) return 'Falta VITE_SUPABASE_ANON_KEY.'
  if (!/^https:\/\/[^\s"'`[\]()=]+$/.test(url)) {
    return 'VITE_SUPABASE_URL no es válida: debe ser solo la dirección, por ejemplo https://xxxx.supabase.co (sin corchetes, comillas ni el nombre de la variable).'
  }
  const esJwt = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(clave)
  const esPublicable = /^sb_publishable_[\w-]+$/.test(clave)
  if (!esJwt && !esPublicable) {
    return 'VITE_SUPABASE_ANON_KEY no es válida: debe ser solo la clave (empieza por eyJ… o sb_publishable_…), sin el nombre de la variable ni comillas.'
  }
  return null
}

export const errorConfiguracion = validarConfiguracion()

if (errorConfiguracion) console.error('[Supabase]', errorConfiguracion)

// Con configuración inválida o ausente, la app cae a modo local en vez de quedar en blanco.
export const supabase = url && clave && !errorConfiguracion ? createClient(url, clave) : null

export const BUCKET_FOTOS = 'evidencias'
