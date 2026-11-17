// Capa de datos. Con Supabase configurado guarda en la nube;
// sin variables de entorno usa localStorage (modo local / pruebas).
// Los componentes solo usan estas funciones, no saben dónde se guarda.
import { supabase, BUCKET_FOTOS } from './supabase'

export const modoNube = Boolean(supabase)
export const CAPTCHA_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || null

// ---------- Conversión fila de BD (snake_case) → objeto de la app ----------
const aApp = (f) => {
  const c = Array.isArray(f.denunciantes) ? f.denunciantes[0] : f.denunciantes
  return {
    id: f.id,
    titulo: f.titulo,
    descripcion: f.descripcion ?? '',
    secretaria: f.secretaria,
    direccion: f.direccion ?? '',
    barrio: f.barrio ?? '',
    lat: f.lat,
    lng: f.lng,
    foto: f.foto_url,
    fotoSolucion: f.foto_solucion_url ?? null,
    youtube: f.youtube ?? '',
    estado: f.estado,
    moderacion: f.moderacion ?? 'aprobada',
    apoyos: f.apoyos ?? 0,
    fechaCreacion: f.created_at,
    fechaSolucion: f.fecha_solucion,
    contacto: c ? { nombre: c.nombre, celular: c.celular, cargo: c.cargo } : null,
  }
}

const COLUMNAS_PUBLICAS = '*'
const COLUMNAS_ADMIN = '*, denunciantes(nombre, celular, cargo)'

// Los errores lanzados por la base de datos (raise exception) ya vienen en español.
const fallo = (accion, error) => {
  console.error(accion, error)
  return new Error(error?.message ? `${accion}: ${error.message}` : accion)
}

// ---------- Fotos en Supabase Storage ----------
async function subirFoto(dataUrl, carpeta = new Date().getFullYear()) {
  const blob = await (await fetch(dataUrl)).blob()
  const ruta = `${carpeta}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw fallo('No se pudo subir la foto', error)
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl
}

function rutaDeFoto(url) {
  const marca = `/object/public/${BUCKET_FOTOS}/`
  const i = url?.indexOf(marca) ?? -1
  return i >= 0 ? decodeURIComponent(url.slice(i + marca.length)) : null
}

const borrarFotos = async (...urls) => {
  const rutas = urls.map(rutaDeFoto).filter(Boolean)
  if (rutas.length) await supabase.storage.from(BUCKET_FOTOS).remove(rutas)
}

// ---------- Modo local (sin Supabase: todo se aprueba directo) ----------
const CLAVE = 'veeduria-pasto:denuncias:v1'
const leerLocal = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE)) ?? [] } catch { return [] }
}
const escribirLocal = (lista) => {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)) } catch (e) {
    throw fallo('Almacenamiento del navegador lleno', e)
  }
}
const actualizarLocal = (id, cambios) => {
  const lista = leerLocal().map((d) => (d.id === id ? { ...d, ...cambios } : d))
  escribirLocal(lista)
  return lista.find((d) => d.id === id)
}

// ---------- Huella anónima del dispositivo (para "Yo también lo veo") ----------
const CLAVE_HUELLA = 'veeduria-pasto:huella'
const CLAVE_APOYADAS = 'veeduria-pasto:apoyadas'

function huella() {
  try {
    let h = localStorage.getItem(CLAVE_HUELLA)
    if (!h) { h = crypto.randomUUID().replace(/-/g, ''); localStorage.setItem(CLAVE_HUELLA, h) }
    return h
  } catch {
    return crypto.randomUUID().replace(/-/g, '')
  }
}

export function denunciasApoyadas() {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE_APOYADAS)) ?? []) } catch { return new Set() }
}
function marcarApoyada(id) {
  try {
    const s = denunciasApoyadas(); s.add(id)
    localStorage.setItem(CLAVE_APOYADAS, JSON.stringify([...s]))
  } catch { /* sin almacenamiento: no pasa nada */ }
}

// ---------- API ----------
export async function listarDenuncias({ admin = false } = {}) {
  if (!modoNube) return leerLocal()
  const { data, error } = await supabase
    .from('denuncias')
    .select(admin ? COLUMNAS_ADMIN : COLUMNAS_PUBLICAS)
    .order('created_at', { ascending: false })
  if (error) throw fallo('No se pudieron cargar las denuncias', error)
  return data.map(aApp)
}

async function obtenerDenuncia(id) {
  const { data, error } = await supabase
    .from('denuncias').select(COLUMNAS_ADMIN).eq('id', id).maybeSingle()
  if (error) throw fallo('No se pudo leer la denuncia', error)
  return data ? aApp(data) : null
}

/**
 * Registra una denuncia. Devuelve la denuncia creada si quien registra es
 * administrador (queda aprobada), o null si es del público (queda en revisión).
 * Con captcha activo, el público envía a /api/denunciar con el token.
 */
export async function crearDenuncia(datos, { admin = false, tokenCaptcha = null } = {}) {
  if (!modoNube) {
    const ahora = new Date().toISOString()
    const nueva = {
      ...datos,
      id: crypto.randomUUID(),
      moderacion: 'aprobada',
      apoyos: 0,
      fechaCreacion: ahora,
      fechaSolucion: datos.estado === 'solucionado' ? ahora : null,
    }
    escribirLocal([nueva, ...leerLocal()])
    return nueva
  }

  const fotoUrl = datos.foto ? await subirFoto(datos.foto) : null
  const c = datos.contacto ?? {}
  const parametros = {
    p_titulo: datos.titulo,
    p_descripcion: datos.descripcion || null,
    p_secretaria: datos.secretaria,
    p_direccion: datos.direccion || null,
    p_barrio: datos.barrio || null,
    p_lat: datos.lat,
    p_lng: datos.lng,
    p_foto_url: fotoUrl,
    p_youtube: datos.youtube || null,
    p_nombre: c.nombre || null,
    p_celular: c.celular || null,
    p_cargo: c.cargo || null,
    p_autoriza_datos: Boolean(c.autoriza),
  }

  if (!admin && CAPTCHA_SITE_KEY) {
    const resp = await fetch('/api/denunciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenCaptcha, parametros }),
    })
    const r = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(r.error ?? 'No se pudo registrar la denuncia.')
    return null
  }

  const { data: id, error } = await supabase.rpc('registrar_denuncia', { ...parametros, p_estado: datos.estado })
  if (error) {
    if (admin) await borrarFotos(fotoUrl) // no dejar la foto huérfana
    throw fallo('No se pudo registrar la denuncia', error)
  }
  return admin ? obtenerDenuncia(id) : null
}

async function actualizar(id, cambios, accion) {
  const { data, error } = await supabase
    .from('denuncias')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS_ADMIN)
    .maybeSingle()
  if (error) throw fallo(accion, error)
  if (!data) throw new Error(`${accion}: no tienes permiso (inicia sesión como veedor).`)
  return aApp(data)
}

/** Marca como solucionada, con foto opcional del "después". */
export async function solucionarDenuncia(id, fotoDespues = null) {
  const ahora = new Date().toISOString()
  if (!modoNube) return actualizarLocal(id, { estado: 'solucionado', fechaSolucion: ahora, fotoSolucion: fotoDespues })
  const url = fotoDespues ? await subirFoto(fotoDespues, 'soluciones') : null
  return actualizar(
    id,
    { estado: 'solucionado', fecha_solucion: ahora, ...(url ? { foto_solucion_url: url } : {}) },
    'No se pudo marcar como solucionada',
  )
}

/** Vuelve a pendiente (quita la foto del después). */
export async function reabrirDenuncia(denuncia) {
  if (!modoNube) return actualizarLocal(denuncia.id, { estado: 'pendiente', fechaSolucion: null, fotoSolucion: null })
  const r = await actualizar(
    denuncia.id,
    { estado: 'pendiente', fecha_solucion: null, foto_solucion_url: null },
    'No se pudo cambiar el estado',
  )
  await borrarFotos(denuncia.fotoSolucion).catch(() => {})
  return r
}

/** decision: 'aprobada' | 'rechazada' | 'revision' */
export async function moderarDenuncia(id, decision) {
  if (!modoNube) return actualizarLocal(id, { moderacion: decision })
  return actualizar(
    id,
    { moderacion: decision, moderada_at: decision === 'revision' ? null : new Date().toISOString() },
    'No se pudo moderar la denuncia',
  )
}

export async function eliminarDenuncia(denuncia) {
  if (!modoNube) {
    escribirLocal(leerLocal().filter((d) => d.id !== denuncia.id))
    return
  }

  const { data, error } = await supabase
    .from('denuncias')
    .delete()
    .eq('id', denuncia.id)
    .select('id')
  if (error) throw fallo('No se pudo eliminar', error)
  if (!data?.length) throw new Error('No tienes permiso para eliminar (inicia sesión como veedor).')

  await borrarFotos(denuncia.foto, denuncia.fotoSolucion).catch(() => {})
}

/** "Yo también lo veo": devuelve el nuevo total de apoyos. */
export async function apoyarDenuncia(id) {
  if (!modoNube) {
    const d = leerLocal().find((x) => x.id === id)
    marcarApoyada(id)
    return actualizarLocal(id, { apoyos: (d?.apoyos ?? 0) + 1 }).apoyos
  }
  const { data, error } = await supabase.rpc('apoyar_denuncia', { p_denuncia: id, p_huella: huella() })
  if (error) throw fallo('No se pudo registrar tu apoyo', error)
  marcarApoyada(id)
  return data
}

// ---------- Seguimiento ----------
export async function listarSeguimiento(denunciaId) {
  if (!modoNube) return []
  const { data, error } = await supabase
    .from('seguimientos')
    .select('id, tipo, detalle, fecha, created_at')
    .eq('denuncia_id', denunciaId)
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw fallo('No se pudo cargar el seguimiento', error)
  return data
}

export async function agregarSeguimiento(denunciaId, { tipo, detalle, fecha }) {
  if (!modoNube) throw new Error('El seguimiento solo está disponible con la base de datos en la nube.')
  const { data, error } = await supabase
    .from('seguimientos')
    .insert({ denuncia_id: denunciaId, tipo, detalle, fecha })
    .select('id, tipo, detalle, fecha, created_at')
    .single()
  if (error) throw fallo('No se pudo guardar el seguimiento', error)
  return data
}

export async function eliminarSeguimiento(id) {
  const { error } = await supabase.from('seguimientos').delete().eq('id', id)
  if (error) throw fallo('No se pudo eliminar', error)
}

export function exportarJSON(denuncias) {
  const blob = new Blob([JSON.stringify(denuncias, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `denuncias-pasto-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
