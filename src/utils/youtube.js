// Extrae el ID de un video de YouTube desde cualquier formato de enlace:
// youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, /embed/ID, /live/ID
export function obtenerIdYoutube(url) {
  if (!url) return null
  const patron =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  const coincidencia = url.trim().match(patron)
  return coincidencia ? coincidencia[1] : null
}

export const esLinkYoutubeValido = (url) => !url || obtenerIdYoutube(url) !== null

export const miniaturaYoutube = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`

export const urlYoutube = (id) => `https://www.youtube.com/watch?v=${id}`
