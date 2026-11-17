import { useEffect, useState } from 'react'

// Límites oficiales (OpenStreetMap, ODbL) guardados en /public:
//  - municipio-pasto.geojson: borde de todo el municipio
//  - comunas-pasto.geojson: las 12 comunas urbanas
let cache = null

export function useZonas() {
  const [zonas, setZonas] = useState(cache ?? { municipio: null, comunas: null })
  useEffect(() => {
    if (cache) return
    const leer = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([leer('/municipio-pasto.geojson'), leer('/comunas-pasto.geojson')])
      .then(([municipio, comunas]) => {
        cache = { municipio, comunas }
        setZonas(cache)
      })
  }, [])
  return zonas
}
