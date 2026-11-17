import '../leaflet-global'
import 'leaflet.markercluster'
import 'leaflet.heat'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, ZoomControl, GeoJSON, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  CENTRO_PASTO, ZOOM_INICIAL, ZOOM_MIN, ZOOM_MAX, LIMITES_NAVEGACION, CAPA_OSM,
} from '../constants/mapa'

// ---------------- Íconos ----------------
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

// Grupo: anillo rojo/verde según la proporción pendiente/solucionado
function iconoGrupo(grupo) {
  const hijos = grupo.getAllChildMarkers()
  const n = hijos.length
  const resueltas = hijos.filter((m) => m.options.tipo === 'solucionado').length
  const pct = Math.round((resueltas / n) * 100)
  const tam = n < 10 ? 38 : n < 50 ? 44 : 52
  return L.divIcon({
    className: 'grupo-denuncias',
    html: `<div class="grupo" style="--pct:${pct}%;width:${tam}px;height:${tam}px"><span>${n}</span></div>`,
    iconSize: [tam, tam],
  })
}

// ---------------- Capas ----------------
function CapaDenuncias({ denuncias, seleccionadaId, onSeleccionar }) {
  const mapa = useMap()
  const grupo = useRef(null)
  const alSeleccionar = useRef(onSeleccionar)
  alSeleccionar.current = onSeleccionar

  useEffect(() => {
    const g = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      disableClusteringAtZoom: 17,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: iconoGrupo,
    })
    mapa.addLayer(g)
    grupo.current = g
    return () => { mapa.removeLayer(g) }
  }, [mapa])

  useEffect(() => {
    const g = grupo.current
    if (!g) return
    g.clearLayers()
    g.addLayers(denuncias.map((d) => {
      const activo = d.id === seleccionadaId
      const m = L.marker([d.lat, d.lng], {
        icon: icono(tipoDe(d), activo),
        zIndexOffset: activo ? 1000 : 0,
        title: d.titulo,
        tipo: tipoDe(d),
        keyboard: true,
      })
      m.on('click', () => alSeleccionar.current(d))
      return m
    }))
  }, [denuncias, seleccionadaId])

  return null
}

function CapaCalor({ denuncias }) {
  const mapa = useMap()
  useEffect(() => {
    const puntos = denuncias.map((d) => [d.lat, d.lng, d.estado === 'pendiente' ? 1 : 0.35])
    const capa = L.heatLayer(puntos, {
      radius: 28, blur: 22, maxZoom: 17, minOpacity: 0.35,
      gradient: { 0.2: '#fde68a', 0.45: '#f59e0b', 0.7: '#ef4444', 1: '#991b1b' },
    })
    capa.addTo(mapa)
    return () => { mapa.removeLayer(capa) }
  }, [denuncias, mapa])
  return null
}

const estiloMunicipio = { color: '#0f172a', weight: 2.5, opacity: 0.55, fill: false }
const estiloComuna = { color: '#334155', weight: 1.5, opacity: 0.7, dashArray: '4 4', fillColor: '#0f172a', fillOpacity: 0.03 }
const etiquetarComuna = (f, capa) =>
  capa.bindTooltip(`C${f.properties.numero}`, { permanent: true, direction: 'center', className: 'etiqueta-comuna' })

// ---------------- Utilidades del mapa ----------------
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

function AjustarTamano({ senal }) {
  const mapa = useMap()
  useEffect(() => {
    const t = setTimeout(() => mapa.invalidateSize(), 250)
    return () => clearTimeout(t)
  }, [senal, mapa])
  return null
}

export default function MapaPasto({
  denuncias, puntoNuevo, seleccionadaId, objetivo, senalTamano, capas, zonas, corregimientos,
  onClickMapa, onSeleccionar,
}) {
  return (
    <MapContainer
      center={CENTRO_PASTO}
      zoom={ZOOM_INICIAL}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      maxBounds={LIMITES_NAVEGACION}
      maxBoundsViscosity={0.8}
      zoomControl={false}
    >
      <TileLayer url={CAPA_OSM.url} attribution={CAPA_OSM.atribucion} maxZoom={ZOOM_MAX} />
      <ZoomControl position="topright" />

      {/* Borde de todo el municipio: siempre visible */}
      {zonas.municipio && <GeoJSON data={zonas.municipio} style={estiloMunicipio} interactive={false} />}

      {capas.zonas && zonas.comunas && (
        <GeoJSON data={zonas.comunas} style={estiloComuna} interactive={false} onEachFeature={etiquetarComuna} />
      )}
      {capas.zonas && corregimientos.map((c) => (
        <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={4} interactive={false}
          pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#0f172a', fillOpacity: 0.9 }}>
          <Tooltip permanent direction="top" offset={[0, -4]} className="etiqueta-corregimiento">{c.nombre}</Tooltip>
        </CircleMarker>
      ))}
      {capas.calor && <CapaCalor denuncias={denuncias} />}

      <CapturadorClics onClick={onClickMapa} />
      <Volar objetivo={objetivo} />
      <AjustarTamano senal={senalTamano} />

      {!capas.calor && (
        <CapaDenuncias denuncias={denuncias} seleccionadaId={seleccionadaId} onSeleccionar={onSeleccionar} />
      )}

      {puntoNuevo && <Marker position={[puntoNuevo.lat, puntoNuevo.lng]} icon={icono('nuevo')} zIndexOffset={2000} />}
    </MapContainer>
  )
}
