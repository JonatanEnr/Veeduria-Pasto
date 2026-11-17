// Distancia en metros entre dos puntos (fórmula de Haversine)
export function distanciaMetros(a, b) {
  const R = 6371000
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ¿El punto [lng, lat] está dentro del anillo? (ray casting)
function dentroDeAnillo([x, y], anillo) {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

function dentroDePoligono(punto, coords) {
  const [exterior, ...huecos] = coords
  return dentroDeAnillo(punto, exterior) && !huecos.some((h) => dentroDeAnillo(punto, h))
}

/** Devuelve el número de comuna (1–12) del punto, o null si está fuera. */
export function comunaDe(lat, lng, comunas) {
  if (!comunas) return null
  const p = [lng, lat]
  for (const f of comunas.features) {
    const { type, coordinates } = f.geometry
    const poligonos = type === 'Polygon' ? [coordinates] : coordinates
    if (poligonos.some((c) => dentroDePoligono(p, c))) return f.properties.numero
  }
  return null
}
