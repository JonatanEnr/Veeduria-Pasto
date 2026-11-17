import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  CENTRO_PASTO, ZOOM_INICIAL, ZOOM_MIN, ZOOM_MAX, LIMITES_PASTO, CAPA_OSM,
} from '../constants/mapa'
import DetalleDenuncia from './DetalleDenuncia'

// Íconos con CSS (evita el problema de rutas de imágenes de Leaflet con Vite)
const crearIcono = (tipo) =>
  L.divIcon({
    className: 'marcador-denuncia',
    html: `<div class="pin ${tipo}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  })

const ICONOS = {
  pendiente: crearIcono('pendiente'),
  solucionado: crearIcono('solucionado'),
  nuevo: crearIcono('nuevo'),
  revision: crearIcono('revision'),
  rechazada: crearIcono('rechazada'),
}

// Lo que no está aprobado (solo lo ve el veedor) se pinta distinto
const iconoDe = (d) =>
  d.moderacion === 'revision' || d.moderacion === 'rechazada'
    ? ICONOS[d.moderacion]
    : ICONOS[d.estado] ?? ICONOS.pendiente

function CapturadorClics({ onClick }) {
  useMapEvents({
    click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

function VolarA({ denuncia, marcadores }) {
  const mapa = useMap()
  useEffect(() => {
    if (!denuncia) return
    mapa.flyTo([denuncia.lat, denuncia.lng], 18, { duration: 0.8 })
    const abrir = () => marcadores.current[denuncia.id]?.openPopup()
    mapa.once('moveend', abrir)
    return () => mapa.off('moveend', abrir)
  }, [denuncia, mapa, marcadores])
  return null
}

export default function MapaPasto({
  denuncias, puntoNuevo, seleccionada, esAdmin, onClickMapa, onAlternarEstado, onModerar, onEliminar,
}) {
  const marcadores = useRef({})

  return (
    <MapContainer
      center={CENTRO_PASTO}
      zoom={ZOOM_INICIAL}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      maxBounds={LIMITES_PASTO}
      maxBoundsViscosity={0.8}
      zoomControl
    >
      <TileLayer url={CAPA_OSM.url} attribution={CAPA_OSM.atribucion} maxZoom={ZOOM_MAX} />

      <CapturadorClics onClick={onClickMapa} />
      <VolarA denuncia={seleccionada} marcadores={marcadores} />

      {denuncias.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={iconoDe(d)}
          ref={(m) => { if (m) marcadores.current[d.id] = m; else delete marcadores.current[d.id] }}
        >
          <Popup maxWidth={300}>
            <DetalleDenuncia
              denuncia={d}
              esAdmin={esAdmin}
              onAlternarEstado={onAlternarEstado}
              onModerar={onModerar}
              onEliminar={onEliminar}
            />
          </Popup>
        </Marker>
      ))}

      {puntoNuevo && <Marker position={[puntoNuevo.lat, puntoNuevo.lng]} icon={ICONOS.nuevo} />}
    </MapContainer>
  )
}
