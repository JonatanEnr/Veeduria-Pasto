import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  CENTRO_PASTO, ZOOM_INICIAL, ZOOM_MIN, ZOOM_MAX, LIMITES_PASTO, CAPA_OSM,
} from '../constants/mapa'

// Íconos con CSS (evita el problema de rutas de imágenes de Leaflet con Vite)
const cache = new Map()
function icono(tipo, activo = false) {
  const clave = `${tipo}:${activo}`
  if (!cache.has(clave)) {
    cache.set(clave, L.divIcon({
      className: 'marcador-denuncia',
      html: `<div class="pin ${tipo}${activo ? ' activo' : ''}"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    }))
  }
  return cache.get(clave)
}

// Lo que no está aprobado (solo lo ve el veedor) se pinta distinto
const tipoDe = (d) =>
  d.moderacion === 'revision' || d.moderacion === 'rechazada' ? d.moderacion : d.estado

function CapturadorClics({ onClick }) {
  useMapEvents({
    click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

// Vuela a un punto. desplazarY (0–1) sube el punto para que no quede
// tapado por el panel inferior en celulares.
function Volar({ objetivo }) {
  const mapa = useMap()
  useEffect(() => {
    if (!objetivo) return
    const zoom = Math.max(mapa.getZoom(), objetivo.zoom ?? 17)
    let centro = L.latLng(objetivo.lat, objetivo.lng)
    if (objetivo.desplazarY) {
      const alto = mapa.getSize().y
      const p = mapa.project(centro, zoom).add([0, alto * objetivo.desplazarY])
      centro = mapa.unproject(p, zoom)
    }
    mapa.flyTo(centro, zoom, { duration: 0.7 })
  }, [objetivo, mapa])
  return null
}

// Recalcula el tamaño cuando cambia el diseño (p. ej. al abrir/cerrar paneles)
function AjustarTamano({ senal }) {
  const mapa = useMap()
  useEffect(() => {
    const t = setTimeout(() => mapa.invalidateSize(), 250)
    return () => clearTimeout(t)
  }, [senal, mapa])
  return null
}

export default function MapaPasto({
  denuncias, puntoNuevo, seleccionadaId, objetivo, senalTamano, onClickMapa, onSeleccionar,
}) {
  return (
    <MapContainer
      center={CENTRO_PASTO}
      zoom={ZOOM_INICIAL}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      maxBounds={LIMITES_PASTO}
      maxBoundsViscosity={0.8}
      zoomControl={false}
    >
      <TileLayer url={CAPA_OSM.url} attribution={CAPA_OSM.atribucion} maxZoom={ZOOM_MAX} />
      <ZoomControl position="topright" />

      <CapturadorClics onClick={onClickMapa} />
      <Volar objetivo={objetivo} />
      <AjustarTamano senal={senalTamano} />

      {denuncias.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={icono(tipoDe(d), d.id === seleccionadaId)}
          zIndexOffset={d.id === seleccionadaId ? 1000 : 0}
          eventHandlers={{ click: () => onSeleccionar(d) }}
          title={d.titulo}
        />
      ))}

      {puntoNuevo && <Marker position={[puntoNuevo.lat, puntoNuevo.lng]} icon={icono('nuevo')} zIndexOffset={2000} />}
    </MapContainer>
  )
}
