import { useEffect, useState } from 'react'

// Límites de las 12 comunas de Pasto (OpenStreetMap, ODbL), en /public.
let cache = null

export function useComunas() {
  const [comunas, setComunas] = useState(cache)
  useEffect(() => {
    if (cache) return
    fetch('/comunas-pasto.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => { cache = g; setComunas(g) })
      .catch(() => setComunas(null))
  }, [])
  return comunas
}
