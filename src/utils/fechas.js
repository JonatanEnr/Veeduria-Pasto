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

export const fechaLarga = (iso) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
