// Capa de datos. Con Supabase configurado guarda en la nube;
// sin variables de entorno usa localStorage (modo local / pruebas).
// Los componentes solo usan estas funciones, no saben dónde se guarda.
import { supabase, BUCKET_FOTOS } from './supabase'

export const modoNube = Boolean(supabase)

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
    youtube: f.youtube ?? '',
    estado: f.estado,
    moderacion: f.moderacion ?? 'aprobada',
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
async function subirFoto(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob()
  const ruta = `${new Date().getFullYear()}/${crypto.randomUUID()}.jpg`
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
 * administrador (queda aprobada), o null si es del público (queda en revisión
 * y no es visible hasta que el veedor la apruebe).
 */
export async function crearDenuncia(datos, { admin = false } = {}) {
  if (!modoNube) {
    const ahora = new Date().toISOString()
    const nueva = {
      ...datos,
      id: crypto.randomUUID(),
      moderacion: 'aprobada',
      fechaCreacion: ahora,
      fechaSolucion: datos.estado === 'solucionado' ? ahora : null,
    }
    escribirLocal([nueva, ...leerLocal()])
    return nueva
  }

  const fotoUrl = datos.foto ? await subirFoto(datos.foto) : null
  const c = datos.contacto ?? {}
  const { data: id, error } = await supabase.rpc('registrar_denuncia', {
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
    p_estado: datos.estado,
  })
  if (error) {
    // Si el registro falla, no dejamos la foto huérfana
    const ruta = rutaDeFoto(fotoUrl)
    if (ruta && admin) await supabase.storage.from(BUCKET_FOTOS).remove([ruta])
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

export async function cambiarEstado(id, estado) {
  const fechaSolucion = estado === 'solucionado' ? new Date().toISOString() : null
  if (!modoNube) return actualizarLocal(id, { estado, fechaSolucion })
  return actualizar(id, { estado, fecha_solucion: fechaSolucion }, 'No se pudo cambiar el estado')
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

  const ruta = rutaDeFoto(denuncia.foto)
  if (ruta) await supabase.storage.from(BUCKET_FOTOS).remove([ruta])
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
