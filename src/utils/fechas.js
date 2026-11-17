const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

const UNIDADES = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function haceCuanto(iso) {
  if (!iso) return ''
  const segundos = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unidad, s] of UNIDADES) {
    if (Math.abs(segundos) >= s) return relativo.format(Math.round(segundos / s), unidad)
  }
  return 'hace un momento'
}

/** Días completos entre dos fechas (hasta = ahora si se omite). */
export const diasEntre = (desde, hasta) =>
  Math.max(0, Math.floor(((hasta ? new Date(hasta) : new Date()).getTime() - new Date(desde).getTime()) / 86400000))

/** Días que lleva abierta (pendiente) o lo que tardó en resolverse. */
export const diasDenuncia = (d) => diasEntre(d.fechaCreacion, d.estado === 'solucionado' ? d.fechaSolucion : null)

export const textoDias = (n) => (n === 1 ? '1 día' : `${n} días`)

export const fechaCorta = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export const fechaLarga = (iso) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
