// Geocodificación inversa con Nominatim (OpenStreetMap):
// convierte el clic (lat, lng) en el nombre real de la calle y el barrio.
// Política de uso: máx. 1 petición/segundo. Aquí solo se llama al hacer clic.
export async function obtenerDireccion(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`

  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const datos = await resp.json()
    const a = datos.address ?? {}

    const calle = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? ''
    const numero = a.house_number ? ` # ${a.house_number}` : ''
    const barrio = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.residential ?? ''

    return {
      direccion: calle ? `${calle}${numero}` : (datos.display_name?.split(',')[0] ?? ''),
      barrio,
    }
  } catch (error) {
    console.warn('Geocodificación no disponible:', error)
    return { direccion: '', barrio: '' }
  }
}
