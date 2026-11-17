// Copia de seguridad COMPLETA de la base de datos y las fotos.
//
//   npm run respaldo        (o doble clic en "Respaldo.cmd")
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local (clave secreta: incluye
// datos personales de denunciantes y denuncias no publicadas).
// Guarda en ./respaldos/AAAA-MM-DD/  (carpeta excluida de git).
import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const URL_SB = process.env.VITE_SUPABASE_URL?.trim()
const CLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
// Sin la clave de servicio se hace un respaldo PARCIAL con la clave pública
// (solo lo publicado: sin datos de denunciantes ni denuncias en revisión).
const CLAVE = CLAVE_SERVICIO || process.env.VITE_SUPABASE_ANON_KEY?.trim()
const PARCIAL = !CLAVE_SERVICIO
const TABLAS = ['denuncias', 'denunciantes', 'seguimientos', 'apoyos']
const BUCKET = 'evidencias'

const existe = (r) => access(r).then(() => true, () => false)
const cabeceras = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` }

async function leerTabla(tabla) {
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_SB}/rest/v1/${tabla}?select=*&limit=1000&offset=${desde}`, { headers: cabeceras })
    if (r.status === 404) return null // la tabla aún no existe (migración no ejecutada)
    if (PARCIAL && (r.status === 401 || r.status === 403)) return undefined // privada: requiere clave de servicio
    if (!r.ok) throw new Error(`${tabla}: ${r.status} ${await r.text()}`)
    const lote = await r.json()
    filas.push(...lote)
    if (lote.length < 1000) return filas
  }
}

async function main() {
  if (!URL_SB || !CLAVE) {
    throw new Error('Faltan las claves de Supabase en .env.local.')
  }
  if (PARCIAL) {
    console.log('⚠ Respaldo PARCIAL: falta SUPABASE_SERVICE_ROLE_KEY en .env.local.')
    console.log('  Se guardan solo las denuncias publicadas (sin datos de denunciantes ni denuncias en revisión).\n')
  }
  const fecha = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' })
  const dir = path.join(RAIZ, 'respaldos', fecha)
  const dirFotos = path.join(RAIZ, 'respaldos', 'fotos') // compartida entre respaldos
  await mkdir(dir, { recursive: true })
  await mkdir(dirFotos, { recursive: true })
  console.log(`💾 Respaldo en ${dir}`)

  const datos = {}
  for (const t of TABLAS) {
    datos[t] = await leerTabla(t)
    if (datos[t] === null) { console.log(`  · ${t}: (no existe todavía)`); continue }
    if (datos[t] === undefined) { console.log(`  · ${t}: (privada, requiere la clave de servicio)`); continue }
    await writeFile(path.join(dir, `${t}.json`), JSON.stringify(datos[t], null, 2), 'utf8')
    console.log(`  ✓ ${t}: ${datos[t].length} filas`)
  }

  // Fotos (antes y después). Solo descarga las que faltan.
  const urls = (datos.denuncias ?? []).flatMap((d) => [d.foto_url, d.foto_solucion_url]).filter(Boolean)
  let nuevas = 0
  for (const u of urls) {
    const i = u.indexOf(`/object/public/${BUCKET}/`)
    if (i < 0) continue
    const relativa = decodeURIComponent(u.slice(i + `/object/public/${BUCKET}/`.length))
    const destino = path.join(dirFotos, ...relativa.split('/'))
    if (await existe(destino)) continue
    const r = await fetch(u)
    if (!r.ok) { console.warn(`  ⚠ No se pudo descargar ${relativa}`); continue }
    await mkdir(path.dirname(destino), { recursive: true })
    await writeFile(destino, Buffer.from(await r.arrayBuffer()))
    nuevas++
  }
  console.log(`  ✓ fotos: ${urls.length} en total, ${nuevas} nuevas descargadas`)
  console.log(`\n✅ Respaldo ${PARCIAL ? 'PARCIAL' : 'completo'}. Guarda la carpeta "respaldos" también fuera de este PC (USB o nube).`)
  console.log('⚠ Contiene datos personales: no la compartas ni la subas a GitHub.')
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`)
  process.exit(1)
})
