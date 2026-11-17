// POST /api/notificar  →  recibe el "Database Webhook" de Supabase cuando
// entra una denuncia nueva y avisa al veedor por Telegram.
// Variables en Vercel: WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
import { obtenerSecretaria } from '../src/constants/secretarias.js'

const esc = (t = '') => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const secreto = process.env.WEBHOOK_SECRET?.trim()
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chat = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!secreto || !token || !chat) return res.status(500).json({ error: 'Notificaciones no configuradas' })
  if (req.headers['x-webhook-secret'] !== secreto) return res.status(401).json({ error: 'No autorizado' })

  const { type, record: d } = req.body ?? {}
  if (type !== 'INSERT' || !d) return res.status(200).json({ ignorado: true })

  const base = `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`
  const ubicacion = [...new Set([d.direccion, d.barrio].filter(Boolean))].join(', ') || 'Sin dirección'
  const enRevision = d.moderacion === 'revision'

  const texto = [
    enRevision ? '🟠 <b>Nueva denuncia por revisar</b>' : '🟢 <b>Nueva denuncia publicada</b>',
    '',
    `<b>${esc(d.titulo)}</b>`,
    `📍 ${esc(ubicacion)}`,
    `🏛 ${esc(obtenerSecretaria(d.secretaria).nombre)}`,
    d.descripcion ? `\n${esc(String(d.descripcion).slice(0, 300))}` : '',
    d.foto_url ? '📷 Con foto' : '',
    '',
    `<a href="${base}/?d=${d.id}">Abrir en el mapa</a>`,
  ].filter((l) => l !== null).join('\n')

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return res.status(r.ok ? 200 : 502).json({ enviado: r.ok })
}
