// Centro exacto solicitado: San Juan de Pasto, Nariño
export const CENTRO_PASTO = [1.2136, -77.2811]

export const ZOOM_INICIAL = 15
export const ZOOM_MIN = 12
export const ZOOM_MAX = 19

// Límites aproximados del área urbana/rural cercana de Pasto,
// para que el mapa no se "escape" a otras ciudades.
export const LIMITES_PASTO = [
  [1.1300, -77.3700], // suroeste
  [1.2900, -77.1900], // noreste
]

// Cartografía real de OpenStreetMap (calles, barrios y nombres reales)
export const CAPA_OSM = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  atribucion:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}
