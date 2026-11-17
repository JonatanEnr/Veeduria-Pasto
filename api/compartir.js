// GET /d/:id  →  página con vista previa (Open Graph) para WhatsApp, Facebook, X…
// Los robots de las redes leen las etiquetas <meta>; las personas son
// redirigidas al mapa con la denuncia abierta.
import { obtenerSecretaria } from '../src/constants/secretarias.js'

const esc = (t = '') =>
  String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const dias = (desde, hasta = Date.now()) =>
  Math.max(0, Math.floor((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000))

async function leerDenuncia(id) {
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const clave = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !clave || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const resp = await fetch(
    `${url}/rest/v1/denuncias?id=eq.${id}&select=titulo,descripcion,barrio,direccion,secretaria,estado,foto_url,foto_solucion_url,created_at,fecha_solucion,apoyos`,
    { headers: { apikey: clave, Authorization: `Bearer ${clave}` } },
  )
  if (!resp.ok) return null
  const [fila] = await resp.json()
  return fila ?? null // solo devuelve denuncias aprobadas (RLS)
}

export default async function handler(req, res) {
  const id = String(req.query.id ?? '')
  const base = `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`
  const destino = `${base}/?d=${encodeURIComponent(id)}`
  const d = await leerDenuncia(id).catch(() => null)

  let titulo = 'Mapa de Denuncias · Veeduría Ciudadana Pasto'
  let descripcion = 'Reporta y sigue los problemas de tu barrio en San Juan de Pasto.'
  let imagen = null

  if (d) {
    const ubicacion = [...new Set([d.direccion, d.barrio].filter(Boolean))].join(', ')
    const entidad = obtenerSecretaria(d.secretaria).corto
    if (d.estado === 'solucionado') {
      titulo = `✅ Solucionado: ${d.titulo}`
      descripcion = `${ubicacion ? `${ubicacion} · ` : ''}${entidad} · Resuelto en ${dias(d.created_at, d.fecha_solucion)} días.`
      imagen = d.foto_solucion_url || d.foto_url
    } else {
      titulo = `🔴 ${d.titulo}`
      descripcion = `${ubicacion ? `${ubicacion} · ` : ''}${entidad} · Lleva ${dias(d.created_at)} días sin solución` +
        `${d.apoyos ? ` · ${d.apoyos} vecinos lo confirman` : ''}.`
      imagen = d.foto_url
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900')
  res.status(200).send(`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Veeduría Ciudadana Pasto" />
<meta property="og:title" content="${esc(titulo)}" />
<meta property="og:description" content="${esc(descripcion)}" />
<meta property="og:url" content="${esc(`${base}/d/${id}`)}" />
${imagen ? `<meta property="og:image" content="${esc(imagen)}" />` : ''}
<meta name="twitter:card" content="${imagen ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(titulo)}" />
<meta name="twitter:description" content="${esc(descripcion)}" />
${imagen ? `<meta name="twitter:image" content="${esc(imagen)}" />` : ''}
<meta http-equiv="refresh" content="0; url=${esc(destino)}" />
</head><body>
<p>Abriendo la denuncia… <a href="${esc(destino)}">Ver en el mapa</a></p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body></html>`)
}
