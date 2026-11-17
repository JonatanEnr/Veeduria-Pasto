// Sincroniza las denuncias de Supabase con notas de Obsidian.
//
//   npm run obsidian
//
// - Crea/actualiza una nota .md por denuncia (con propiedades filtrables).
// - Descarga la foto de evidencia a la carpeta "adjuntos".
// - NUNCA borra lo que escribas debajo de "## Mis notas".
// - Si una denuncia se elimina del mapa, la nota se conserva con en_mapa: false.
//
// Carpeta destino: OBSIDIAN_CARPETA_DENUNCIAS en .env.local
// (por defecto ../Mapa Denuncias Pasto/Denuncia).
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { obtenerSecretaria } from '../src/constants/secretarias.js'
import { obtenerIdYoutube, urlYoutube } from '../src/utils/youtube.js'

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const URL_SB = process.env.VITE_SUPABASE_URL?.trim()
const CLAVE = process.env.VITE_SUPABASE_ANON_KEY?.trim()
const CARPETA = path.resolve(
  RAIZ,
  process.env.OBSIDIAN_CARPETA_DENUNCIAS?.trim() || '../Mapa Denuncias Pasto/Denuncia',
)
const ADJUNTOS = path.join(CARPETA, 'adjuntos')
const MARCA_NOTAS = '## Mis notas'
const ZONA = 'America/Bogota'

// ---------------------------------------------------------------- utilidades
const existe = (ruta) => access(ruta).then(() => true, () => false)
const yaml = (v) => (v === null || v === undefined || v === '' ? '' : JSON.stringify(String(v)))

function fechaLocal(iso) {
  if (!iso) return ''
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`
}

const nombreSeguro = (t) =>
  t.replace(/[\\/:*?"<>|#^[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Denuncia'

// ---------------------------------------------------------------- datos
async function traerDenuncias() {
  const todas = []
  const paso = 1000
  for (let desde = 0; ; desde += paso) {
    const resp = await fetch(
      `${URL_SB}/rest/v1/denuncias?select=*&order=created_at.asc&limit=${paso}&offset=${desde}`,
      { headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` } },
    )
    if (!resp.ok) throw new Error(`Supabase respondió ${resp.status}: ${await resp.text()}`)
    const lote = await resp.json()
    todas.push(...lote)
    if (lote.length < paso) return todas
  }
}

async function indexarNotas() {
  const indice = new Map()
  for (const nombre of await readdir(CARPETA)) {
    if (!nombre.endsWith('.md')) continue
    const texto = await readFile(path.join(CARPETA, nombre), 'utf8')
    const m = texto.match(/^denuncia_id:\s*"?([0-9a-f-]{36})"?\s*$/m)
    if (m) indice.set(m[1], { nombre, texto })
  }
  return indice
}

async function descargarFoto(d) {
  if (!d.foto_url) return null
  const ext = path.extname(new URL(d.foto_url).pathname) || '.jpg'
  const archivo = `${d.id}${ext}`
  const destino = path.join(ADJUNTOS, archivo)
  if (await existe(destino)) return archivo
  try {
    const resp = await fetch(d.foto_url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    await writeFile(destino, Buffer.from(await resp.arrayBuffer()))
    return archivo
  } catch (e) {
    console.warn(`  ⚠ No se pudo descargar la foto de "${d.titulo}": ${e.message}`)
    return null
  }
}

// ---------------------------------------------------------------- nota
function construirNota(d, foto, notasPrevias) {
  const sec = obtenerSecretaria(d.secretaria)
  const solucionado = d.estado === 'solucionado'
  const estado = solucionado ? 'Solucionado' : 'Pendiente'
  const idVideo = obtenerIdYoutube(d.youtube)
  const osm = `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=18/${d.lat}/${d.lng}`
  const gmaps = `https://www.google.com/maps?q=${d.lat},${d.lng}`
  const ubicacion = [...new Set([d.direccion, d.barrio].filter(Boolean))].join(' · ') || 'Sin dirección'

  const propiedades = [
    '---',
    `denuncia_id: ${yaml(d.id)}`,
    `titulo: ${yaml(d.titulo)}`,
    `estado: ${estado}`,
    `secretaria: ${yaml(sec.corto)}`,
    `entidad: ${yaml(sec.nombre)}`,
    `direccion: ${yaml(d.direccion)}`,
    `barrio: ${yaml(d.barrio)}`,
    `fecha: ${fechaLocal(d.created_at)}`,
    `fecha_solucion: ${fechaLocal(d.fecha_solucion)}`,
    `location:`,
    `  - ${d.lat}`,
    `  - ${d.lng}`,
    `mapa: ${yaml(osm)}`,
    `youtube: ${yaml(d.youtube)}`,
    `foto: ${foto ? yaml(`[[${foto}]]`) : ''}`,
    `en_mapa: true`,
    'tags:',
    '  - denuncia',
    `  - ${solucionado ? 'solucionado' : 'pendiente'}`,
    `  - secretaria/${sec.id}`,
    '---',
  ].join('\n')

  const cuerpo = [
    '%% Generado por el Mapa de Denuncias: esta parte se actualiza sola al sincronizar. Escribe tus apuntes debajo de "## Mis notas". %%',
    '',
    `# ${d.titulo}`,
    '',
    `> [!${solucionado ? 'success' : 'danger'}] ${solucionado ? '🟢' : '🔴'} ${estado}`,
    `> **Responsable:** ${sec.nombre}`,
    `> **Ubicación:** ${ubicacion}`,
    `> **Registrada:** ${fechaLocal(d.created_at).replace('T', ' ')}`,
    ...(solucionado && d.fecha_solucion ? [`> **Solucionada:** ${fechaLocal(d.fecha_solucion).replace('T', ' ')}`] : []),
    '',
    ...(d.descripcion ? [d.descripcion, ''] : []),
    ...(foto ? ['## Evidencia', '', `![[${foto}]]`, ''] : []),
    ...(idVideo ? ['## Video', '', `![](${urlYoutube(idVideo)})`, ''] : []),
    `📍 [Ver en OpenStreetMap](${osm}) · [Google Maps](${gmaps})`,
    '',
    MARCA_NOTAS,
    '',
  ].join('\n')

  return `${propiedades}\n${cuerpo}${notasPrevias}`
}

function notasDelUsuario(texto) {
  const i = texto?.indexOf(`\n${MARCA_NOTAS}\n`) ?? -1
  return i >= 0 ? texto.slice(i + MARCA_NOTAS.length + 2).replace(/^\n/, '') : ''
}

// ---------------------------------------------------------------- vista (Bases)
const VISTA_BASE = `filters:
  and:
    - file.hasTag("denuncia")
views:
  - type: table
    name: Pendientes
    filters:
      and:
        - estado == "Pendiente"
        - en_mapa == true
    order:
      - file.name
      - secretaria
      - barrio
      - fecha
  - type: table
    name: Solucionadas
    filters:
      and:
        - estado == "Solucionado"
    order:
      - file.name
      - secretaria
      - barrio
      - fecha_solucion
  - type: table
    name: Todas
    order:
      - file.name
      - estado
      - secretaria
      - barrio
      - fecha
      - en_mapa
`

// ---------------------------------------------------------------- principal
async function main() {
  if (!URL_SB || !CLAVE) {
    throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local')
  }
  console.log(`📂 Carpeta de Obsidian: ${CARPETA}`)
  await mkdir(ADJUNTOS, { recursive: true })

  const [denuncias, indice] = await Promise.all([traerDenuncias(), indexarNotas()])
  const usados = new Set((await readdir(CARPETA)).map((n) => n.toLowerCase()))
  const cuenta = { nuevas: 0, actualizadas: 0, iguales: 0, retiradas: 0 }

  for (const d of denuncias) {
    const previa = indice.get(d.id)
    const foto = await descargarFoto(d)
    const contenido = construirNota(d, foto, notasDelUsuario(previa?.texto))

    let nombre = previa?.nombre
    if (!nombre) {
      const base = `${fechaLocal(d.created_at).slice(0, 10)} ${nombreSeguro(d.titulo)}`
      nombre = `${base}.md`
      if (usados.has(nombre.toLowerCase())) nombre = `${base} (${d.id.slice(0, 6)}).md`
      usados.add(nombre.toLowerCase())
    }

    if (previa?.texto === contenido) { cuenta.iguales++; continue }
    await writeFile(path.join(CARPETA, nombre), contenido, 'utf8')
    previa ? cuenta.actualizadas++ : cuenta.nuevas++
    console.log(`  ${previa ? '↻' : '＋'} ${nombre}`)
  }

  // Denuncias eliminadas del mapa: se conserva la nota, marcada.
  const vigentes = new Set(denuncias.map((d) => d.id))
  for (const [id, { nombre, texto }] of indice) {
    if (vigentes.has(id) || !/^en_mapa: true$/m.test(texto)) continue
    await writeFile(path.join(CARPETA, nombre), texto.replace(/^en_mapa: true$/m, 'en_mapa: false'), 'utf8')
    cuenta.retiradas++
    console.log(`  ✕ ${nombre} (ya no está en el mapa)`)
  }

  const rutaBase = path.join(CARPETA, 'Denuncias.base')
  if (!(await existe(rutaBase))) {
    await writeFile(rutaBase, VISTA_BASE, 'utf8')
    console.log('  ＋ Denuncias.base (vista de tabla)')
  }

  console.log(
    `\n✅ ${denuncias.length} denuncias · ${cuenta.nuevas} nuevas · ${cuenta.actualizadas} actualizadas · ` +
    `${cuenta.iguales} sin cambios · ${cuenta.retiradas} retiradas del mapa`,
  )
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`)
  process.exit(1)
})
