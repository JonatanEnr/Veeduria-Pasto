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

const dentroDeFeature = (p, f) => {
  const { type, coordinates } = f.geometry
  const poligonos = type === 'Polygon' ? [coordinates] : coordinates
  return poligonos.some((c) => dentroDePoligono(p, c))
}

/** ¿El punto está dentro de alguna figura de la colección GeoJSON? */
export const dentroDe = (lat, lng, coleccion) =>
  Boolean(coleccion?.features.some((f) => dentroDeFeature([lng, lat], f)))

/**
 * Zona del municipio a la que pertenece un punto:
 *  - dentro de una comuna (polígono oficial) → { tipo: 'comuna', clave: 'c3', nombre: 'Comuna 3' }
 *  - fuera → corregimiento con la cabecera más cercana (aproximación)
 */
export function zonaDe(lat, lng, comunas, corregimientos) {
  const p = [lng, lat]
  const comuna = comunas?.features.find((f) => dentroDeFeature(p, f))
  if (comuna) {
    const n = comuna.properties.numero
    return { tipo: 'comuna', clave: `c${n}`, nombre: `Comuna ${n}`, orden: n }
  }
  if (!comunas || !corregimientos?.length) return null
  let mejor = null
  let menor = Infinity
  for (const c of corregimientos) {
    for (const [plat, plng] of [[c.lat, c.lng], ...(c.referencias ?? [])]) {
      const m = distanciaMetros({ lat, lng }, { lat: plat, lng: plng })
      if (m < menor) { menor = m; mejor = c }
    }
  }
  return { tipo: 'corregimiento', clave: mejor.id, nombre: mejor.nombre, orden: 100 }
}
