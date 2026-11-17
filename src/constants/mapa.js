// Centro: San Juan de Pasto, Nariño
export const CENTRO_PASTO = [1.2136, -77.2811]

export const ZOOM_INICIAL = 15
export const ZOOM_MIN = 10 // permite ver todo el municipio (zona urbana + 19 corregimientos)
export const ZOOM_MAX = 19

// Rectángulo que contiene TODO el municipio de Pasto (límite oficial en OpenStreetMap:
// lat 0.821–1.354, lng −77.384 – −77.027). Se usa para validar la ubicación.
export const LIMITES_MUNICIPIO = [
  [0.81, -77.395], // suroeste
  [1.365, -77.015], // noreste
]

// Margen extra para que el mapa no se "escape" pero se pueda mover con comodidad.
export const LIMITES_NAVEGACION = [
  [0.74, -77.48],
  [1.43, -76.93],
]

// Cartografía real de OpenStreetMap (calles, barrios y nombres reales)
export const CAPA_OSM = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  atribucion:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}
