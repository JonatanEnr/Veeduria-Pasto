// POST /api/denunciar  →  verifica el captcha (Cloudflare Turnstile) y
// registra la denuncia con la clave de servicio. Solo se usa cuando el
// captcha está activado (ver supabase/04-activar-captcha.sql).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const url = process.env.VITE_SUPABASE_URL?.trim()
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const secreto = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!url || !servicio || !secreto) {
    return res.status(500).json({ error: 'El servidor no tiene configurado el captcha.' })
  }

  const { token, parametros } = req.body ?? {}
  if (!token || typeof parametros !== 'object' || parametros === null) {
    return res.status(400).json({ error: 'Solicitud incompleta.' })
  }

  // 1) Verificar el captcha
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  const verif = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secreto, response: token, ...(ip ? { remoteip: ip } : {}) }),
  }).then((r) => r.json()).catch(() => ({ success: false }))

  if (!verif.success) {
    return res.status(403).json({ error: 'No pudimos verificar que no eres un robot. Intenta de nuevo.' })
  }

  // 2) Registrar (solo los parámetros esperados; nunca se acepta p_estado del público)
  const PERMITIDOS = [
    'p_titulo', 'p_descripcion', 'p_secretaria', 'p_direccion', 'p_barrio', 'p_lat', 'p_lng',
    'p_foto_url', 'p_youtube', 'p_nombre', 'p_celular', 'p_cargo', 'p_autoriza_datos',
  ]
  const cuerpo = Object.fromEntries(PERMITIDOS.map((k) => [k, parametros[k] ?? null]))
  cuerpo.p_estado = 'pendiente'

  const resp = await fetch(`${url}/rest/v1/rpc/registrar_denuncia`, {
    method: 'POST',
    headers: {
      apikey: servicio,
      Authorization: `Bearer ${servicio}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  })
  const datos = await resp.json().catch(() => null)
  if (!resp.ok) {
    return res.status(400).json({ error: datos?.message ?? 'No se pudo registrar la denuncia.' })
  }
  return res.status(200).json({ id: datos })
}
