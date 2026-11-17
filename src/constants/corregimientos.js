// Corregimientos del municipio de Pasto y la ubicación de su cabecera (poblado principal).
//
// OpenStreetMap no tiene los LÍMITES de los corregimientos, así que cada denuncia
// rural se asigna al corregimiento cuya cabecera esté más cerca (aproximación).
// Si consigues el mapa oficial de límites (POT, shapefile o GeoJSON), se puede
// reemplazar esta aproximación por los polígonos reales.
//
// Fuente de coordenadas: OpenStreetMap / Nominatim. `verificar: true` = ubicación dudosa.
export const CORREGIMIENTOS = [
  { id: 'anganoy', nombre: 'Anganoy', lat: 1.2139, lng: -77.3029 },
  { id: 'buesaquillo', nombre: 'Buesaquillo', lat: 1.2091, lng: -77.2416 },
  { id: 'cabrera', nombre: 'Cabrera', lat: 1.2151, lng: -77.2146 },
  { id: 'catambuco', nombre: 'Catambuco', lat: 1.1664, lng: -77.2993 },
  { id: 'el-encano', nombre: 'El Encano', lat: 1.1627, lng: -77.1563 },
  { id: 'el-socorro', nombre: 'El Socorro', lat: 1.1827, lng: -77.148, verificar: true },
  { id: 'genoy', nombre: 'Genoy', lat: 1.2691, lng: -77.3358 },
  { id: 'gualmatan', nombre: 'Gualmatán', lat: 1.1718, lng: -77.318 },
  { id: 'jamondino', nombre: 'Jamondino', lat: 1.1837, lng: -77.2606 },
  { id: 'jongovito', nombre: 'Jongovito', lat: 1.1878, lng: -77.2949 },
  { id: 'la-caldera', nombre: 'La Caldera', lat: 1.3319, lng: -77.3327, verificar: true },
  { id: 'la-laguna', nombre: 'La Laguna', lat: 1.2042, lng: -77.2096 },
  { id: 'mapachico', nombre: 'Mapachico', lat: 1.2377, lng: -77.3181 },
  { id: 'mocondino', nombre: 'Mocondino', lat: 1.1939, lng: -77.2496 },
  { id: 'morasurco', nombre: 'Morasurco', lat: 1.2664, lng: -77.2769 }, // cabecera: Daza
  { id: 'obonuco', nombre: 'Obonuco', lat: 1.1904, lng: -77.3065 },
  { id: 'san-fernando', nombre: 'San Fernando', lat: 1.2024, lng: -77.2251 },
  // ⚠ Este punto cae FUERA del límite municipal en OpenStreetMap: confirmar ubicación real.
  { id: 'santa-barbara', nombre: 'Santa Bárbara', lat: 1.0843, lng: -77.3135, verificar: true },
  // Pendiente: Los Casanares (corregimiento 19, anunciado en octubre de 2026).
  // Agrega aquí su cabecera cuando se confirme: { id: 'los-casanares', nombre: 'Los Casanares', lat: …, lng: … },
]
