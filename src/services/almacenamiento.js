// Capa de datos. Con Supabase configurado guarda en la nube;
// sin variables de entorno usa localStorage (modo local / pruebas).
// Los componentes solo usan estas funciones, no saben dónde se guarda.
import { supabase, BUCKET_FOTOS } from './supabase'

export const modoNube = Boolean(supabase)

// ---------- Conversión fila de BD (snake_case) ⇄ objeto de la app ----------
const aApp = (f) => ({
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
  fechaCreacion: f.created_at,
  fechaSolucion: f.fecha_solucion,
})

const aFila = (d, fotoUrl) => ({
  titulo: d.titulo,
  descripcion: d.descripcion || null,
  secretaria: d.secretaria,
  direccion: d.direccion || null,
  barrio: d.barrio || null,
  lat: d.lat,
  lng: d.lng,
  foto_url: fotoUrl,
  youtube: d.youtube || null,
  estado: d.estado,
  fecha_solucion: d.estado === 'solucionado' ? new Date().toISOString() : null,
})

const fallo = (accion, error) => {
  console.error(accion, error)
  return new Error(`${accion}: ${error.message ?? error}`)
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

// ---------- Modo local ----------
const CLAVE = 'veeduria-pasto:denuncias:v1'
const leerLocal = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE)) ?? [] } catch { return [] }
}
const escribirLocal = (lista) => {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)) } catch (e) {
    throw fallo('Almacenamiento del navegador lleno', e)
  }
}

// ---------- API pública ----------
export async function listarDenuncias() {
  if (!modoNube) return leerLocal()
  const { data, error } = await supabase
    .from('denuncias')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw fallo('No se pudieron cargar las denuncias', error)
  return data.map(aApp)
}

export async function crearDenuncia(datos) {
  if (!modoNube) {
    const nueva = {
      ...datos,
      id: crypto.randomUUID(),
      fechaCreacion: new Date().toISOString(),
      fechaSolucion: datos.estado === 'solucionado' ? new Date().toISOString() : null,
    }
    escribirLocal([nueva, ...leerLocal()])
    return nueva
  }

  const fotoUrl = datos.foto ? await subirFoto(datos.foto) : null
  const { data, error } = await supabase
    .from('denuncias')
    .insert(aFila(datos, fotoUrl))
    .select()
    .single()
  if (error) throw fallo('No se pudo registrar la denuncia', error)
  return aApp(data)
}

export async function cambiarEstado(id, estado) {
  const fechaSolucion = estado === 'solucionado' ? new Date().toISOString() : null

  if (!modoNube) {
    const lista = leerLocal().map((d) => (d.id === id ? { ...d, estado, fechaSolucion } : d))
    escribirLocal(lista)
    return lista.find((d) => d.id === id)
  }

  const { data, error } = await supabase
    .from('denuncias')
    .update({ estado, fecha_solucion: fechaSolucion })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw fallo('No se pudo cambiar el estado', error)
  if (!data) throw new Error('No tienes permiso para cambiar el estado (inicia sesión como veedor).')
  return aApp(data)
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
