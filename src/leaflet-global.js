// Los plugins leaflet.markercluster y leaflet.heat esperan `L` global.
// Este módulo debe importarse ANTES que ellos.
import L from 'leaflet'

window.L = L
